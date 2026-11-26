export interface User { id:string; name:string; handle:string; avatar:string; city:string; bio:string }
export type ReactionType='amei'|'brabo'|'morri'|'palmas'|'resenha'
export interface MusicTrack { id:string; title:string; artist:string; src:string }
export interface FilterPreset { id:string; name:string; css:string }
export interface Comment { id:string; user:User; text:string; audio?:string; duration?:number; likes:number; liked:boolean; time:string }
export interface Post { id:string; user:User; image:string; caption:string; location:string; category:string; time:string; filter:string; track?:MusicTrack; reactions:Record<ReactionType,number>; myReaction?:ReactionType; comments:Comment[]; tags:string[] }
export interface StorySlide {image:string; caption:string}
export interface Story {id:string; name:string; image:string; open:boolean; slides:StorySlide[]}
export type Draft=Pick<Post,'image'|'caption'|'location'|'filter'|'track'|'category'>
export type Tab='feed'|'explore'|'clips'|'profile'

