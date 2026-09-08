import JSZip from 'jszip';
import { writeFile } from 'node:fs/promises';
const zip = new JSZip();
const xml = (text) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${text}`;
const run = (text, extra = '') => `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="PingFang SC"/>${extra}</w:rPr><w:t xml:space="preserve">${text}</w:t></w:r>`;
const p = (text, props = '', extra = '') => `<w:p><w:pPr><w:spacing w:after="180" w:line="320" w:lineRule="auto"/>${props}</w:pPr>${run(text, extra)}</w:p>`;
const heading = (text) => p(text, '<w:spacing w:before="300" w:after="160"/>', '<w:b/><w:sz w:val="28"/><w:color w:val="214578"/>');
zip.file('[Content_Types].xml', xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>'));
zip.file('_rels/.rels', xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'));
zip.file('word/_rels/document.xml.rels', xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>'));
zip.file('word/styles.xml', xml('<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="PingFang SC"/><w:sz w:val="22"/><w:color w:val="38465B"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>'));
zip.file('word/comments.xml', xml(`<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:comment w:id="0" w:author="SuperDocx" w:initials="SD" w:date="2026-09-08T12:00:00Z">${p('这是一条保存在 DOCX 中的示例批注。试试回复，也可以选中文字添加你自己的批注。')}</w:comment></w:comments>`));
zip.file('word/document.xml', xml(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${p('A LITTLE SPACE FOR BIG IDEAS', '<w:jc w:val="center"/>', '<w:sz w:val="18"/><w:color w:val="718AB1"/>')}
${p('一份文档，无限可能。', '<w:jc w:val="center"/><w:spacing w:before="160" w:after="180"/>', '<w:b/><w:sz w:val="44"/><w:color w:val="214578"/>')}
${p('欢迎来到你的离线文档工作台', '<w:jc w:val="center"/>', '<w:sz w:val="24"/><w:color w:val="8090A9"/>')}
${p('SUPERDOCX  /  GETTING STARTED', '<w:jc w:val="center"/><w:spacing w:after="400"/>', '<w:sz w:val="16"/><w:color w:val="9AA5B8"/>')}
${heading('01  让阅读更专注')}
${p('从一份熟悉的 Word 文档开始。打开本地 DOCX，查看文字、表格和页面布局，也可以切换到查看模式，安心阅读。')}
${heading('02  把想法写下来')}
${p('点击正文就能开始编辑。你可以修改这一段话，调整字体、加粗重点，或使用工具栏整理段落。按 ⌘ / Ctrl S，将修改保存到本地。')}
${heading('03  让反馈留在上下文里')}
<w:p><w:pPr><w:spacing w:after="180" w:line="320"/></w:pPr>${run('选中一段文字，')}<w:commentRangeStart w:id="0"/>${run('添加你的第一条批注', '<w:color w:val="1953FF"/>')}<w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r>${run('。批注与文字一起保存在 DOCX 中，下次打开时，讨论仍在原来的位置。')}</w:p>
${p('文档在本机处理。无需登录，无需上传，打开应用即可开始。', '<w:spacing w:before="350"/><w:pBdr><w:top w:val="single" w:sz="6" w:space="16" w:color="DDE6F4"/></w:pBdr>', '<w:sz w:val="20"/><w:color w:val="8392AC"/>')}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1100" w:right="1100" w:bottom="1100" w:left="1100" w:header="708" w:footer="708"/></w:sectPr></w:body></w:document>`));
await writeFile('public/welcome.docx', await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
