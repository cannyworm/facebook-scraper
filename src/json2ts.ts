import fs from 'fs/promises' 



const IsArraySame = function<T>( a : T[] , b : T[] ) {
    const result = a.map( et => !!b.includes( et ) )
    return !result.includes( false )
}


interface INode {
    __typename : string
}


type NativeType = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "function"

const NativeTypes : NativeType[] = [
    "string" , "number" , "bigint" , "boolean" , "symbol" , "undefined" , "function"
]

type TType = "class" | "array" | "null"  | NativeType 


let global_counter = 0

interface IType { get type() : TType }

class CType implements IType {

    private _type : TType


    constructor ( type? : TType ) {
        this._type = type ?? "undefined"
    }

 

    get type() {
        return this._type
    }

    setType( type : TType ) {
        this._type = type
    }

    isClass() : this is CClass  {
        return this.type == 'class'
    }

    isArray() : this is CArray  {
        return this.type == 'array'
    }


    isSame( b : CType ) {
        return this.type == b.type
    }


    toStr() : string {
        return this.type
    }

}

class CNamedType extends CType {

    name : string

    constructor( type? : TType , name? : string ) {
        super( type )
        this.name  = name ?? `T${(global_counter++).toString()}`
    }

    isSame(b: CNamedType): boolean {
        return super.isSame(b) && this.name == b.name
    }



    toStr(): string {
        return this.name
    }

}

interface IProperty {
    name : string
    types : CType[]
}

class CProperty implements IProperty {

    name: string
    types = new Array<CType>()

    constructor( name : string , types : CType[] | CType ) {
        this.name = name
   

        if ( types instanceof Array )
            this.types.push( ...types )
        else
            this.types.push( types )
    }

    addType( type :  CType ) {
        if ( !this.types.find( et => et == type )) 
            this.types.push( type )
    }
    toStr() {
        return `${this.name} : ${this.types.map( t => t.toStr() ).join("|") };`
    }

}



class CClass extends CNamedType {

    is_node = false    
    properties = new Array<CProperty>()

    constructor( name? : string ) {
        super( "class", name )
    }



    addProp( name : string , type : CType ) {
        this.properties.push( new CProperty( name , type ))
    }


    getProp( name : string ) {
        return this.properties.find( prop => prop.name == name )
    }


    toStr(): string {
        // return node as default type name
        if ( this.is_node )
            return super.toStr()

        // return inline struct for non node
        let head = `{\n`
        let body = this.properties.map( prop => {
            return "\t" + prop.toStr()
        }).join("\n")
        let end  = `\n}`

        return head + body + end
    }

    Dump() {
        let class_name = super.toStr()

        let head = `interface ${class_name} {\n`
        let body = this.properties.map( prop => {

            // Hax !!!
            if ( prop.name == '__typename')
                return `\t __typename : "${this.name}"`

            return "\t" + prop.toStr()
        }).join("\n")
        let end  = `\n}`

        return head + body + end
    }


}

class CArray extends CNamedType {

    etypes = new Array<CType>()
    constructor( name ? : string , etypes ? : CType[] ) {

        super( "array" , name )

        if( etypes )
            this.etypes.push( ...etypes )
    }

    addType( type : CType ) {
        if ( !this.etypes.find( e => e.type == type.type ))
            this.etypes.push( type )
    }

    toStr(): string {
        if ( this.etypes.length == 0 )
            return "[]"
        return `(${this.etypes.map( t => t.toStr() ).join(" |")})[]`
    }

    isSame( b : CArray ) {

        if ( this.etypes.length != b.etypes.length)
            return false

        return IsArraySame( this.etypes , b.etypes )
    }

}

interface __ctx {
    key   : string
    parent? : CClass
    // override key value
    name ? : string
    prev? : __ctx
} 

class CParser {

    types = new Array<CType>(  )

    empty_array_type : CType

    constructor() {

        this.types.push( new CArray( ) )
        this.empty_array_type = this.types[0]

        this.types.push( new CType( "null" ) )

        for ( const t of NativeTypes) {
            this.types.push( new CType( t ) )
        }
     
    }


    get_name_from_prop( prop_name : string ) {
        return prop_name.split('_').map( name => name ? name[0].toUpperCase() + name.substring(1) : "" ).join("")
    }

    id = 0
    GenName() {
        return `R${this.id++}`
    }
    

    isArray<T = any>( obj : any ) : obj is Array<T> {
        return obj && typeof obj?.push != 'undefined'
    }


    Parse ( obj : any , ctx? : __ctx  ) : CType {

        const obj_typeof = typeof obj

        if ( obj == null)
            return this.types.find( type => type.type == "null" )!

        if ( obj_typeof != 'object') 
            return this.types.find( type => type.type == obj_typeof )!

        let obj_name = ctx?.name

        if ( this.isArray( obj ) ) {

            const array_type = new CArray( obj_name )

            obj.forEach( (e , i) => array_type.addType( this.Parse( e , { name : this.get_name_from_prop( obj_name + "_" + i) , key : i.toString() , prev : ctx }  ) ) )

            const array_dup = this.types.find( type => type.isArray() && type.isSame( array_type ) ) 

            if ( array_dup )
                return array_dup
            
            this.types.push( array_type )
            return array_type
        }

        const obj_keys  = Object.keys( obj )

        let obj_is_node = false;
        if ( obj_keys.includes("__typename") ) {

            obj_name = (obj as INode).__typename
            obj_is_node = true

        }

        let   obj_dup   = this.types.find( type => type.isClass() && type.name == obj_name ) as CClass
        const obj_class = obj_dup ?? new CClass( obj_name )

        obj_class.is_node = obj_is_node

        // Prevent object with same name in same object to have duplicate name
        if ( !obj_dup ) 
            this.types.push( obj_class )

        for ( const pkey of obj_keys ) {

            const prop = obj[ pkey ]

            // graphql thing 
            if ( pkey == "extensions" || pkey.startsWith("__module"))
                continue

            let prop_name    = this.get_name_from_prop( obj_name + "_" + pkey )

            const prop_type  = this.Parse( prop , { parent : obj_class , key : pkey , name : prop_name , prev : ctx })

            const obj_prop   = obj_class.getProp( pkey ) 

            if ( obj_prop ) {
                obj_prop.addType( prop_type )
            } else {
                obj_class.addProp( pkey , prop_type )
            }

        }


        return obj_class

    }


    Dump() {

        let buffer = "";

        let cache : Array<CClass> = [];

        ( this.types.filter( t => t.isClass() ) as Array<CClass> ).forEach( cl => {
            if (!cl.is_node)
                return
            cache.push( cl )
            buffer += cl.Dump() 
            // buffer ++ "\n" + `export {${cl.name}} \n`
        })



        buffer += `\n type Nodes =  ${ cache.map( c => c.name ).join(" |") } `
        buffer += `\n export { ${ cache.map( c => c.name ).join(" ,")} , Nodes} `
        return buffer
    }

}

const examples = [ 
    {
        __typename: "Story",
        __isFeedUnit: "Story",
        debug_info: null,
        id: "asdfkwkljsflkjasdkldfsadfkj=",
        sponsored_data: null,
        feedback: {
            associated_group: null,
            id: "sklajklasdfjklasdf",
        }
    },{

        __typename: "Story",
        __isFeedUnit: "Story",
        debug_info: { time : 10000 },
        id: "aaaa",
        sponsored_data: null,
        feedback: {
            associated_group: null,
            id: "++++++++++",
        }
    },
    {

        __typename: "Story",
        __isFeedUnit: "Story",
        debug_info: { time : null },
        id: "aaaa",
        sponsored_data: null,
        feedback: {
            associated_group: null,
            id: "++++++++++",
        },
        feed : {
            back : {
                shit : 0x1337
            }
        }
    },

]


async function main() {

    const res = JSON.parse( await (await fs.readFile('./temp/res.json' )).toString() )

    const parser = new CParser()

    for ( let i = 0; i < res.length ; i ++) {
        const cl = parser.Parse( res[i] , { key : "Root" + i } )
    }
    await fs.writeFile(`./temp/classes.ts`, parser.Dump())

    console.log(
        "finished"
    )
}

main()