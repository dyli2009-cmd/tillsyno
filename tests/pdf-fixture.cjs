function drawing(){
 const content='0.5 w 100 100 800 1300 re S 100 700 m 900 700 l S 500 100 m 500 1400 l S';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1000 1500] /Resources << >> /Contents 4 0 R >>',`<< /Length ${content.length} >>\nstream\n${content}\nendstream`,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1000 1500] /Resources << >> /Contents 4 0 R >>'];
 let text='%PDF-1.4\n',offsets=[0];objects.forEach((object,i)=>{offsets.push(text.length);text+=`${i+1} 0 obj\n${object}\nendobj\n`});const start=text.length;text+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return Buffer.from(text);
}
module.exports=drawing;
