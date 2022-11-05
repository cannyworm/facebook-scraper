
import querystring from "querystring";

import axios, { AxiosError, AxiosResponse } from "axios";
import axios_instance from "../AxiosInstance"
import { Nodes } from "./classes";

interface Root<T = Nodes> {
  data : {
    node : T
  },
  extensions : {}
}

class Grahql {

    private doc_id! : string 


    async create_requests( p : any ) {
      return axios_instance.post< Root[] > ( "api/graphql/", querystring.stringify( p ), {
        headers : {
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
        },
        transformResponse : [
            ( data : string ) => {
                return data.split("\n").map( t => JSON.parse(t) )
            }
        ],
    } )
    }

    async get_page_lastest_post( params : { page_id : string , doc_id : string } ) {

        const variables = {
          UFI2CommentsProvider_commentsKey: "ProfileCometTimelineRoute",
          afterTime: null,
          beforeTime: null,
          count: 3,
          cursor: null,
          displayCommentsContextEnableComment: null,
          displayCommentsContextIsAdPreview: null,
          displayCommentsContextIsAggregatedShare: null,
          displayCommentsContextIsStorySet: null,
          displayCommentsFeedbackContext: null,
          feedLocation: "TIMELINE",
          feedbackSource: 0,
          focusCommentID: null,
          memorializedSplitTimeFilter: null,
          omitPinnedPost: true,
          postedBy: null,
          privacy: null,
          privacySelectorRenderLocation: "COMET_STREAM",
          renderLocation: "timeline",
          scale: 1,
          stream_count: 1,
          taggedInOnly: null,
          useDefaultActor: false,
          id: params.page_id,
        };

        const body = {
          fb_api_caller_class: "RelayModern",
          fb_api_req_friendly_name: "ProfileCometTimelineFeedRefetchQuery",
          variables: JSON.stringify(variables),
          doc_id: params.doc_id,
        };

        try {
          const resp =  await this.create_requests( body )
          return resp.data
        } catch( err ) {
          if ( err instanceof AxiosError ) {
            if ( err.status == 404) {
              throw new Error("404 Can't find this page")
            }
          }

          throw err 
        }

    }


}

export { Grahql , Root }