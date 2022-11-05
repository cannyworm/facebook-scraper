/**
 * Implement cacheing system ( prevent rate limit )
 * Implemet the rest of scraping 
 *  - grahql cursor 
 *  - page id 
 *  - cursor isn't required
 * seem like there are errors in our reqeusts
 * store page id , script location for next use
 */

import { Facebook } from "./Facebook";
import { Grahql, Root } from "./Facebook/Graphql";
import { Renderer, SimplePost } from './Facebook/Renderer';
import { Scraper } from "./Facebook/Scraper";



export {
  Facebook,

  Renderer,
  SimplePost,
  Scraper,

  Grahql,
  Root
}
