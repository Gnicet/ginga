import { useState, type ImgHTMLAttributes } from 'react'
export default function Image({src,alt,...rest}:ImgHTMLAttributes<HTMLImageElement>){
 const [failed,setFailed]=useState<string>()
 const fallback="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#efd8b5"/><circle cx="290" cy="100" r="40" fill="#ffab4d"/><path d="M0 250Q90 120 190 205T400 145V300H0" fill="#659577"/><path d="M0 270Q125 170 225 255T400 228V300H0" fill="#30795b"/></svg>')
 return <img {...rest} alt={alt??''} src={src&&failed!==src?src:fallback} onError={()=>setFailed(src)}/>
}
