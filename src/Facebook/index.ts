import axios_instance from "../AxiosInstance"
import { Grahql } from "./Graphql"
import { Renderer, SimplePost } from "./Renderer"
import { Scraper } from "./Scraper"



const CHAR_NUM = [
    '0','1','2','3','4','5','6','7','8','9'
]

const isNum = ( str : string ) => {
    return !str.split("").find( c => !CHAR_NUM.includes( c ) )
}

class Facebook {

    axios = axios_instance

    prev_scraper_id? : string 

    scraper  = new Scraper()
    renderer = new Renderer()
    grapql   = new Grahql()

    doc_id? : string


    private async load_scraper( page_id : string ) {
        if ( this.prev_scraper_id == page_id)
            return;

        this.prev_scraper_id = page_id
        const page_content = await this.axios.get<string>( page_id )
        this.scraper.parse( page_content.data )
    }

    private async init_doc_id( page_id : string = "facebook" ) {
        await this.load_scraper( page_id )
        this.doc_id = await this.scraper.async_get_doc_id()
    }

    async get_page_num_id( page_id : string ) {

        if ( !Number.isNaN( parseInt(page_id) ) )
            return page_id

        await this.load_scraper( page_id )
        return await this.scraper.async_get_page_id()
    }

    async get_page_lastes_post( page_id : string ) {

        if ( !this.doc_id )
            await this.init_doc_id( page_id )

        if ( !this.doc_id )
            throw new Error("Invalid doc_id")

        page_id = await this.get_page_num_id( page_id )
        const gr = await this.grapql.get_page_lastest_post({ page_id , doc_id : this.doc_id })
        const posts : SimplePost[] = [] 

        gr.forEach( g => {
            const stories = this.renderer.get_stories( g.data.node )
            stories.forEach( story => {
                const post = this.renderer.render_post( story )
                posts.push( post )
            })
        })


        return posts
    }


}


export { Facebook }