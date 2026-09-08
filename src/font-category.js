// OOXML family/pitch and Latin PANOSE classify a face without guessing from its name.
export function fontCategory({name='',family='',pitch='',panose=''}={}) {
 if(pitch==='fixed'||/^(Courier( New)?|Consolas|Menlo|Monaco|Liberation Mono|DejaVu Sans Mono)$/i.test(name))return 'monospace';
 if(family==='modern')return 'monospace';
 if(family==='roman')return 'serif';
 if(family==='swiss')return 'sans-serif';
 const bytes=panose.match(/../g)?.map(v=>parseInt(v,16))||[];
 if(bytes[0]===2){if(bytes[3]===9)return 'monospace';if(bytes[1]>=2&&bytes[1]<=10)return 'serif';if(bytes[1]>=11&&bytes[1]<=15)return 'sans-serif';}
 if(/^(宋体|SimSun|楷体(_GB2312)?|KaiTi(_GB2312)?|仿宋|FangSong|Times New Roman|Georgia|Cambria)$/i.test(name))return 'serif';
 if(/^(黑体|SimHei|微软雅黑|Microsoft YaHei|Arial|Calibri|Aptos|Helvetica)$/i.test(name))return 'sans-serif';
 return null;
}
