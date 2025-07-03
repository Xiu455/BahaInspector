const cheerio = require('cheerio');

// const ROOTDIR = process.cwd();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const targetUrl = (name, page=1) => {
    return `https://forum.gamer.com.tw/search.php?bsn=60076&q=${name}&page=${page}&advancedSearch=1&sortType=mtime&firstFloorOnly=0&exact=1`
};

const getPostListHtml = async (username, token='', page=1) => {
    const response = await fetch(targetUrl(username, page), {
        method: 'GET',
        headers: {
            'Cookie':`BAHARUNE=${token};`
        }
    })

    return await response.text();
}

async function runWithConcurrencyLimit(tasks, max, fn=()=>{}){
    const results = new Array(tasks.length);
    let taskIndex = 0;
  
    // 每個 worker 負責一個 task 然後再抓下一個
    async function worker() {
        while(taskIndex < tasks.length){
            const current = taskIndex++;
            try {
                const result = await tasks[current]();
                results[current] = result;
                fn();
            }catch (err){
                throw err;
            }
        }
    }

    // 召喚 worker
    const workers = [];
    for (let i = 0; i < Math.min(max, tasks.length); i++) {
        workers.push(worker());
    }

    await Promise.all(workers);
  
    return results;
}

// 檢查 BAHARUNE 是否有效
const checkTokenBH = async (token) => {
    const html = await getPostListHtml('', token);
    const $ = cheerio.load(html);

    return $('.frame p').eq(0).text() === '請輸入搜尋關鍵字!';
};

const createBartex = (options) => {
    options = {
        fetchDelay: 1000,
        worker: 5,
        ...options,
    }

    let {
        fetchDelay,
        worker,
    } = options;

    const listeners = {};       // 事件監聽器

    let totalCount = 0;         // 總頁數
    let completedCount = 0;     // 已完成頁數
    let BAHARUNE = '';          // BAHARUNE Token

    /**
     * @param {*} newOptions.fetchDelay 延遲時間
     * @param {*} newOptions.worker 同時執行任務數
     */
    function setOpt(newOptions){
        options = { ...options, ...newOptions };
        fetchDelay = options.fetchDelay;
        worker = options.worker;
    }

    function on(eventName, callback){
        if(!listeners[eventName]){
            listeners[eventName] = [];
        }
        listeners[eventName].push(callback);
    }

    function emit(eventName, data) {
      if(listeners[eventName]){
        listeners[eventName].forEach(cb => cb(data));
      }
    }

    const getHtml = async(username, page=1) => {
        return await getPostListHtml(username, BAHARUNE, page);
    }

    const parseHtml = async (username, page=1) => {
        const html = await getHtml(username, page);
        const $ = cheerio.load(html);
        const postListDom = $('.search-result_body>.flex');

        const postList = postListDom.map((i, e) => {
            const $e = $(e);
            
            const url = $e.find('.search-result_title a').attr('href');
            const parsedUrl = new URL(url);
            const paramsUrl = parsedUrl.searchParams;

            const title = $e.find('.search-result_title a').text().trim();

            const tpye_date = $e.find('.forum-textinfo span').eq(0).text().trim().split(' - ');
            if(!tpye_date[1]){
                tpye_date[1] = tpye_date[0];
                tpye_date[0] = '';
            }
            
            return{
                url: url,
                url_params:{
                    kanbanID: paramsUrl.get('bsn'),
                    PostID: paramsUrl.get('sn') ?? paramsUrl.get('snA'),
                },
                title: title,
                content: $e.find('.search-result_text').text().trim(),
                type: tpye_date[0]?.trim(),
                dete: tpye_date[1]?.replace('- ', '').trim(),
                gp: parseInt($e.find('.forum-textinfo span').eq(1).text().replace('GP', '').trim()),
                isRE: title.startsWith('RE:'),
            };
        }).toArray();

        await delay(fetchDelay);
        
        return postList;
    }

    // 獲取頁數
    const getPageCount = async(username) => {
        let result = null;
        const html = await getHtml(username);
        const $ = cheerio.load(html);

        $('script').each((i, el) => {
            let content = $(el).html();
    
            if (content.includes('showPageButton')) {
                // 排除 function 定義 避免誤判
                content = content.replace(/function\s+showPageButton/, '_');
    
                // 擷取呼叫函式的第三個參數(頁數)
                const match = content.match(/showPageButton\s*\(\s*[^,]+,\s*[^,]+,\s*([^,]+)\s*,/);
                if (match && match[1]) {
                    result = match[1].trim();
                    return false;
                }
            }
        });
        return parseInt(result ?? 0);
    }

    const get = async (username, BAHARUNE_token) => {
        BAHARUNE = BAHARUNE_token;
        const result = {
            username,
            targetUrl: targetUrl(username),
            postListData: [],
        };

        const pageCount = await getPageCount(username);

        if(typeof pageCount !== 'number' || pageCount == 0){
            console.error('無法取得資料');
            return result;
        }

        emit('pageFetched', pageCount); // 頁數抓取完成

        totalCount = pageCount;

        const tasks = [];
        for(let i = 1; i <= totalCount; i++){
            tasks.push(
                () => parseHtml(username, i)
            );
        }

        completedCount = 0;
        const postListData = await runWithConcurrencyLimit(tasks, worker, () => {
            completedCount++;

            emit('parsing', {
                totalCount,
                completedCount,
            });
        });

        emit('parseFinished', null);     // 解析完成

        result.postListData = [].concat(...postListData);

        return result;
    };

    return{
        setOpt,
        get,
        on,
    }
}

module.exports = {
    checkTokenBH,
    createBartex,
}