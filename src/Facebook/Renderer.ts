import { CometFeedStoryDefaultContentStrategy, CometFeedStoryDefaultContextLayoutStrategy, CometStoryAttachedStoryInvertedLayoutStrategy, Nodes, Story, StoryAttachment } from "./classes";


interface Author {
    name : string
    pfp  : string
}

interface SimplePost {
    author   : Author
    id : string
    text   ? : string
    images   : string[]
    share  ? : SimplePost

    timestamp : number
    url : string
}


class Renderer {

    render_attachment ( attacments : StoryAttachment[] ) : string[] {

        const images : string[] = []

        attacments.forEach( at => {
            if ( at.styles.__typename == 'StoryAttachmentPhotoStyleRenderer' ) {
                return images.push( (at.styles.attachment.media.image ?? at.styles.attachment.media.photo_image).uri ) 
            }
            if ( at.styles.__typename == 'StoryAttachmentAlbumStyleRenderer' ) {
                return images.push( ... at.styles.attachment.all_subattachments.nodes.map( node => node.media.image.uri ) )
            }
        })


        return images
    }

    render_story_content( story_content : CometFeedStoryDefaultContentStrategy["story"] , context ? : CometFeedStoryDefaultContextLayoutStrategy | CometStoryAttachedStoryInvertedLayoutStrategy)  {

            const author : Author = {
                name : "<name>",
                pfp  : "<pfp>"
            }

            const post : SimplePost = {
                author,
                text   : "<text>",
                images : [],
                url : "<url>",
                timestamp : 0,
                id : "<id>"
            }

            post.id = story_content.id
            post.url = story_content.wwwURL
            post.text = story_content.message?.text ?? ""

            const context_layout = story_content.comet_sections.context_layout ?? context
            if ( context_layout) {
                const timestamp = context_layout.story.comet_sections.metadata.find( m => m.__typename == 'CometFeedStoryMinimizedTimestampStrategy')

                if ( timestamp )
                    // convert from unix time to js Date time
                    post.timestamp = timestamp.story.creation_time * 1000

                const actor = context_layout.story.comet_sections.actor_photo.story.actors[0]

                if ( actor ) {
                    post.author.pfp  = actor.profile_picture.uri
                    post.author.name = actor.name
                }
            }

            if ( story_content.attachments )
                post.images = this.render_attachment( story_content.attachments )
            
            if ( story_content.attached_story ) {
                post.share        = this.render_story_content( story_content.attached_story as CometFeedStoryDefaultContentStrategy["story"], story_content.comet_sections.attached_story?.story.attached_story.comet_sections.attached_story_layout )
            }

        return post
    }

    render_post( node : Story ) {
        return this.render_story_content( node.comet_sections.content.story )
    }


    get_stories( node : Nodes ) : Story[] {

        if (!node)
            return []

        if ( node.__typename == 'Story')
            return [ node ]

        if ( node.__typename == 'User' ) {
            return node.timeline_list_feed_units.edges.map( edge => edge.node )
        }

        if ( node.__typename == 'Page' ) {
            return node.timeline_feed_units.edges.map( edge => edge.node )
        }


        throw new Error(`Can't parse ${node.__typename}`)
    }

}

export { Renderer , SimplePost , Author }