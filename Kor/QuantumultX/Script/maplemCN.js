const isMarketVersions = $request.url.indexOf('MarketVersion') > -1;
const isAssetBundleTable = $request.url.indexOf('AssetBundle_table.xml') > -1;
const isRedirect = $request.url.indexOf('_1/') > -1;
const mode = $prefs.valueForKey('maplem-kr-mode');//汉化模式
const modeConfig = {
    'BASE':{
        API:'https://raw.githubusercontent.com/MapleRen/MapleStoryM-language/master/xml/mod.xml',
        files:['data.bin.lan.kor.tbl', 'data.table.unity3d'],
        prefix:'msm_kor_needRedirect',
        title:'基础汉化'
    },
    'PRO':{
        API:'https://raw.githubusercontent.com/MapleRen/MapleStoryM-language/master/xml/mod_pro.xml',
        files:['data.bin.lan.kor.tbl', 'data.table.unity3d','data.language_kor.unity3d'],
        prefix:'msm_kor_needRedirect',
        title:'进阶汉化'
    }
}

function rewrite(config) {
    let body = compressXml($response.body);
    const crcReg = /.*<Header CRC=\"(.*?)\"([^\[]*)/gm;
      
    const xmlCRC = body.replace(crcReg,'$1');$task.fetch({url:config.API}).then(response => {

        if (response.statusCode != 200) {
            notifyAndSetValue(config.title,'XML请求失败，请重试','false',config.prefix);
            $done({});
        }
        const latestXml = compressXml(response.body);
        const latestXmlCRC = latestXml.replace(crcReg,'$1');
        if(xmlCRC != latestXmlCRC){
            notifyAndSetValue(config.title,'汉化文件未更新，请关注微博"冒险岛M第三汉化委"获取最新消息','false',config.prefix);
            $done({});
        }else{
            for (let i = 0; i < config.files.length; i++) {
                const file = config.files[i]
                const fileCRC = latestXml.getXmlAttr(file,"FileCRC");
                const fileSize = latestXml.getXmlAttr(file,"Size");
                body = body.setXmlAttr(file,"FileCRC",fileCRC).setXmlAttr(file,"CRC",fileCRC).setXmlAttr(file,"Size",fileSize);
            }
            notifyAndSetValue(config.title,'补丁下载完成即可完成汉化','true',config.prefix);
            //console.log(body);
            $done(body);
        }
    }, reason => {
        notifyAndSetValue(config.title,reason.error,'false',config.prefix);
        $done(body);
    });
}

String.prototype.getXmlAttr =function(path,attr){
    const reg = new RegExp(`^(.*Path=\"${path}\"[^\>]*${attr}=\")(\\d+)(\".*)`)
    return this.replace(reg,'$2')
}
String.prototype.setXmlAttr =function(path,attr,value){
    const reg = new RegExp(`^(.*Path=\"${path}\"[^\>]*${attr}=\")\\d+(\".*)`)
    return this.replace(reg,`$1${value}$2`)
}

function compressXml(xml){
    const rep = /\n+/g;
    const repone = /<!--.*?-->/ig;
    const reptwo = /\/\*.*?\*\//ig;
    const reptree = /[ ]+</ig;
    let sourceZero = xml.replace(rep,"").replace(/[\r\n]/g,"");
    let sourceOne = sourceZero.replace(repone,"");
    let sourceTwo = sourceOne.replace(reptwo,"");
    let sourceTree = sourceTwo.replace(reptree,"<");
    return sourceTree;
}

function notifyAndSetValue(title,msg,success,prefix){
    $notify(title, "", msg);
    $prefs.setValueForKey(success, prefix)
}

function redirect(config) {
    const github_path = 'https://raw.githubusercontent.com/MapleRen/MapleStoryM-language/master/';
    const need_redirect = $prefs.valueForKey(config.prefix);
    const file_name = $request.url.slice($request.url.lastIndexOf('@') + 1);
    if (need_redirect == 'true') {
        const mStatus = "HTTP/1.1 302 Found";
        const mHeaders = { "Location": `${github_path}${file_name}` };
        const mResponse = {
            status: mStatus,
            headers: mHeaders
        }
        $done(mResponse);
    }
}



if(mode == 'CLEAR'){
    console.log("缓存清除模式")
    if(isRedirect){
        console.log("重定向")
        var mStatus = "HTTP/1.1 302 Found";
        var mHeaders = {"Location": $request.url.replace('_1/','/')};
        var mResponse = {
            status:mStatus,
            headers:mHeaders
        }
        $done(mResponse);
    }
    else if (isMarketVersions) {
        console.log("CLEAR-缓存修改")
        var body = $response.body;
        var list = body.split('\n');
        var fileList = ['data.bin.lan.kor.tbl', 'data.language_kor.unity3d', 'data.table.unity3d']
        for (let i = 0; i < list.length; i++) {
            if (list[i].indexOf('\/AppStore\/') > -1) {
                list[i] = list[i].replace('/" Server', '_1/" Server')
            }
        }
        var xmlData = list.join('\n')
        $done(xmlData)
    } 
    else if(isAssetBundleTable) {
        console.log("CLEAR-TABLE修改")
        var body = $response.body;
        var list = body.split('\n');
        var fileList = ['data.bin.lan.kor.tbl', 'data.language_kor.unity3d', 'data.table.unity3d']
        for (let i = 0; i < list.length; i++) {
            var flag = fileList.filter(function (item) { return list[i].indexOf(item) > -1; }).length > 0;
            if (flag) {
                list[i] = list[i].replace(/Version="[0-9.]*?"/i, 'Version="99"')
            }
        }
        var xmlData = list.join('\n')
        $done(xmlData)
    }
    else{
        console.log("CLEAR-放行")
        $done({});
    }
}
else if (mode == 'BASE' || mode == 'PRO'){
    if(isAssetBundleTable){
        rewrite(modeConfig[mode]);
    }else{
        redirect(modeConfig[mode]);
    }
}else{
    console.log("韩文原版模式")
    $done({});
}



