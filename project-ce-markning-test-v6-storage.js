/* One compressed JSON stream in the working PDF. No per-door rendered documents. */
(function(){'use strict';
function read(pdf,key){
 const name=PDFLib.PDFName.of(key),entry=pdf.catalog.lookup(name);if(!entry)throw Error('Projektuppgifterna saknas.');
 if(entry instanceof PDFLib.PDFRawStream)return JSON.parse(new TextDecoder().decode(PDFLib.decodePDFRawStream(entry).decode()));
 let text='';const bytes=entry.asBytes?.();
 if(bytes?.length>=2&&bytes[0]===254&&bytes[1]===255)text=new TextDecoder('utf-16be').decode(bytes.subarray(2));
 else if(bytes?.length>=2&&bytes[0]===255&&bytes[1]===254)text=new TextDecoder('utf-16le').decode(bytes.subarray(2));
 else if(bytes){for(let offset=0;offset<bytes.length;offset+=8192){let hex='';for(const byte of bytes.subarray(offset,offset+8192))hex+=byte.toString(16).padStart(2,'0');text+=PDFLib.PDFHexString.of(hex).decodeText();}}
 else text=entry.decodeText?.()||entry.asString?.()||'';
 return JSON.parse(text);
}
function write(pdf,key,value){const bytes=new TextEncoder().encode(JSON.stringify(value));pdf.catalog.set(PDFLib.PDFName.of(key),pdf.context.register(pdf.context.flateStream(bytes)));}
window.TillsynoCEStorage={read,write};
})();
