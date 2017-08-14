const Market = require('./engine.js');
const api_key = require('./config/api_key.js');
const config = require('./config');
const app = 'tf';

let market = new Market(api_key);


market.socket.connect();

market.on('connected', function () {
    market.socket.subscribe('newitems_' + app);
    market.socket.subscribe('history_' + app);
});

market.on('additem', function (message) {
    // TODO Приходит объект правильного вида {app:app, data:{ x:'x', y:'y', ...}}
    // console.log(message);
    if (message.app && message.data) {
        let app = message.app, data = message.data;
        if (data['ui_status'] === '1' || +data['ui_status'] === 1) {
            console.log('additem_' + app + ': Я выставил предмет "' + data['i_market_name'].trim() + '" за '
                + (data['ui_price']).toFixed(2) + ' руб. https://'
                + config.app[app] + '/item/' + data['i_classid'] + '-' + data['i_instanceid']);
        }
        if (data['ui_status'] === '3' || +data['ui_status'] === 3) {
            console.log('additem_' + app + ': Я купил "' + data['i_market_name'].trim() + '" за '
                + (data['ui_price']).toFixed(2) + ' руб. (Ожидается передача боту) https://'
                + config.app[app] + '/item/' + data['i_classid'] + '-' + data['i_instanceid']);
        }
        if (app === 'go') {
            console.log(data)
        }
    }
    else console.error('additem error:\n', message)
});

market.on('itemout_new', function (message) {
    // TODO Приходит объект правильного вида {app:app, data:{ x:'x', y:'y', ...}}
    // console.log(message);
    if (message.app && message.data) {
        let app = message.app, data = message.data;
        if (data['ui_status']) {
            if (data['ui_status'] === '3') {
                console.log('itemout_new_' + app + ': У меня купили "' + (data['i_market_name']).trim()
                    + '" (' + data['i_market_hash_name'] + ') за ' + (data['ui_price']).toFixed(2) + ' руб. ui_id: ' + data['ui_id'])
            }
            else console.error('++itemout_new_' + app + ': ', data)
        }
        else if (data['clear'] === true) {
            console.log('itemout_new_' + app + ': Я передал все купленные у меня предметы');
        }
        else console.error('++itemout_new_' + app + ': ', data)
    }
    else console.error('itemout_new error:\n', message)
});

market.on('itemstatus', function (message) {
    // TODO Приходит объект правильного вида {app:app, data:{ x:'x', y:'y', ...}}
    // { app: 'tf', data: { id: '2492559', status: 4, bid: '361355610', left: 14400 }}
    // { app: 'tf', data: { id: '2492559', status: 5 }}
    // { app: 'tf', data: { id: '2576002', status: 6 }} Вроде если не передал предмет, проверить
    // console.log(message);
    if (message.app && message.data) {
        let app = message.app, data = message.data;
        if (data.status) {
            if (data.status === 4) {
                console.log('itemstatus_' + app + ': Предмет готов к получению! ID предмета: '
                    + data['id'] + ' Бот ID: ' + data['bid'])
            }
            else if (data.status === 5) {
                console.log('itemstatus_' + app + ': Предмет удаляется из Trades! ID предмета: ' + data['id'])
            }
            else console.error('++itemstatus_' + app + ': ', data)
        }
        else console.error('++itemstatus_' + app + ': ', data)
    }
    else console.error('itemstatus error:\n', message)
});

market.on('invcache', function (message) {
    // TODO Приходит объект правильного вида {app:app, data:{time:{string}}}
    // console.log(message);
    let app = message.app;
    console.log('invcache_' + app + ': ' + 'Обновлён инвентарь - ' + message.data.time)
});

market.on('money', function (message) {
    // TODO приходит строка, надо выковыривать значение баланса
    // console.log(message);
    let money = message.split('<');
    if (typeof +money[0] === "number") {
        console.log('money: Баланс ' + +money[0] + ' руб.');
    }
    else console.error('Ошибка при получении баланса!\n', message)
});

market.on('webnotify', function (message) {
    // TODO приходит строка, надо парсить, получается объект
    // TODO ВООБЩЕ ПОЛУЧАЮТСЯ РАЗНЫЕ ОБЪЕКТЫ!!!
    // console.log(message);
    message = JSON.parse(message);
    let app = '', text = '';
    if (message.app) {
        app = message.app;
    }
    if (message.url) {
        if (message.url === 'https://' + config.app['tf'] + '/sell/') {
            app = 'tf'
        }
    }
    if (message.text) {
        text = message.text;
    }
    if (message.name && message['way'] === 'ibuy') {
        text = 'У меня купили ' + message.name.trim() + ' за ' + (message['price'] / 100).toFixed(2) + ' руб.'
    }
    if (app !== '') {
        app = '_' + app;
    }
    console.log('webnotify' + app + ': ' + text + ' tag: ' + message['tag'])
});


market.on('history', function (message) {
    // TODO Приходит объект {app:app, data:string}, data надо парсить, получается массив O_o
    // console.log(message);
    let app = message.app;
    let data = JSON.parse(message.data);
    console.log('history_' + app + ': ' + (+data[4] / 100).toFixed(2) + ' руб. ' + data[5].trim() + ' (' + data[2] + ') '
        + data[3] + ' https://' + config.app[app] + '/item/' + data[0] + '-' + data[1]);
});


market.api.call('tf', 'GetMoney', function (err, data) {
    if (err) return console.error(err);
    console.log('Account balance: ' + (data['money'] / 100) + ' руб.');
});
