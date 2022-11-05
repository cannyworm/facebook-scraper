
import html , { HTMLElement } from "node-html-parser";
import axios_instance from "../AxiosInstance";

/**
 * 
 */

class Scraper {

    html_doc! : HTMLElement 

    constructor( html_raw? : string ) {
        if ( html_raw )
            this.parse( html_raw )
    }

    scripts! : HTMLElement[]

    parse( html_raw : string ) {
        this.html_doc = html.parse( html_raw )
        this.scripts = this.html_doc.querySelectorAll('script')
    }

    async async_get_doc_id() : Promise<string> {

        if (!this.html_doc)
            throw new Error("this.html_doc is undefined")
        
        return this.get_doc_id_simple()
    }

    // Find better way to handle difference between simple and new page
    private async get_doc_id_simple() : Promise<string> {
        const pldmp_key = "window.pldmp = "

        try {
            const pldmp_script = this.scripts.find( script => script.textContent.startsWith( pldmp_key ))

            if (!pldmp_script)
                throw new Error("Can't find pldmp_script")

            const raw_assets = pldmp_script.textContent.substring(
                pldmp_key.length,
                pldmp_script.textContent.length - 1
            )

            const raw_pldmp_assets = JSON.parse( raw_assets )
            const assets = raw_pldmp_assets[Object.keys(raw_pldmp_assets)[0]] 
            const p_assets = Object.keys( assets ).filter((key) => {
                const asset = assets[key];
                const refs = asset.refs;
                const cond = refs.includes("htmlStart") && refs.includes("tierTwo") && refs.includes("tierThree") && ( 
                    refs.includes("adp_ProfileCometTimelineFeedQueryRelayPreloader_{N}") || refs.includes("adp_CometPageCardsContainerQueryRelayPreloader_{N}")
                )
                return cond;
            });

            if ( p_assets.length == 0 )
                throw new Error("p_assets.length == 0")

            let doc_id_key;

            const finder = p_assets.map( async key => {
                const asset = assets[ key ]
                const script_src : string = asset.url 

                try {

                    const script_res = await axios_instance.get<string>( script_src )
                    const script_data = script_res.data

                    if ( script_data.includes("ProfileCometTimelineFeedRefetchQuery_facebookRelayOperation") ) {
                        doc_id_key = `("ProfileCometTimelineFeedRefetchQuery_facebookRelayOperation"`
                        return script_data
                    }
                    else if ( script_data.includes("CometModernPageFeedPaginationQuery_facebookRelayOperation")) {
                        doc_id_key = `("CometModernPageFeedPaginationQuery_facebookRelayOperation"`
                        return script_data
                    }


                } catch( err ) {
                    console.log(`[ERROR] Can't fetch ${script_src}`)
                }

                return;
            })

            // console.log( assets )

            const finder_results = await Promise.all( finder );
            const finder_target  = finder_results.find( f => !!f )

            if (!finder_target )
                throw new Error("Can't find doc_id script")

            if (!doc_id_key)
                throw new Error("Invalid doc_id_key")

            const doc_id_start_key = `e.exports="`

            const doc_id_line = finder_target.indexOf( doc_id_key )

            if (doc_id_line == -1)
                throw new Error("Can't find doc_id_key")

            const doc_id_start = finder_target.indexOf( doc_id_start_key , doc_id_line ) + doc_id_start_key.length
            const doc_id_end   = finder_target.indexOf( '"' , doc_id_start )
            const doc_id       = finder_target.substring( 
                doc_id_start,
                doc_id_end
            );
            

            return doc_id 
        }
        catch( err ) {
            console.log(
                `[ERROR] ${err}`
            )
        }

        throw new Error("Can't find doc_id")
    }


    get_page_id() : string {

        const id_url = this.html_doc.querySelector('meta[property="al:android:url"]')?.getAttribute('content')

        if ( id_url )  {
            const start_id = id_url.lastIndexOf('/')
            return id_url.substring( start_id + 1)
        }

        const page_id_key    = `"pageID":"`
        for ( let i = 0 ; i < this.scripts.length;i++) {
            const script = this.scripts[i]
            const script_text = script.textContent
            let start = script_text.indexOf( page_id_key ) 
            if ( start != -1) {
                start += page_id_key.length
                return script_text.substring( start , script_text.indexOf('"', start ))
            }
        }  

        throw new Error("Can't get id")
    }


    async async_get_page_id() : Promise<string> {

        const id_url = this.html_doc.querySelector('meta[property="al:android:url"]')?.getAttribute('content')

        if ( id_url )  {
            const start_id = id_url.lastIndexOf('/')
            return id_url.substring( start_id + 1)
        }


        const page_id_key    = `"pageID":"`

        const find = new Promise<string>( ( resolve , reject ) => {

            const promises : Promise<boolean>[] = []

            for ( let i = 0 ; i < this.scripts.length;i++) {
                const script = this.scripts[i]
                const script_text = script.textContent
                promises.push( (async () => {
                    let start = script_text.indexOf( page_id_key ) 
                    if ( start != -1) {
                        start += page_id_key.length
                        let id = script_text.substring( start , script_text.indexOf('"', start ))
                        resolve(id)
                        return true
                    }
                    return false
                })() )
            }  

            Promise.all( promises ).then( res => {
                if (!res.includes(true))
                    reject("Can't get page id ")
            })


        })

        return await find
    }



}

export { Scraper }