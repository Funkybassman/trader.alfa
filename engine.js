const websocket = require('ws');
const request = require('request');
const queue = require('./queue');
const config = require('./config');
const empty = x => true;

class Market {

    constructor(opts) {
        if (typeof opts === 'string') this.apikey = opts;
        else this.apikey = opts.apikey;
        if (!opts && !opts.apikey) throw new Error('Specify your API KEY');
        this.q_tf = new queue({interval: 200, name: 'tf_api_calls'});
        this.q_go = new queue({interval: 200, name: 'go_api_calls'});
        this.q_dt = new queue({interval: 200, name: 'dt_api_calls'});
        this.q_gt = new queue({interval: 200, name: 'gt_api_calls'});
    }

    get api() {
        let self = this;
        return {
            call: function (app, method, callback = empty, list) {
                let req_time = Date.now();
                let f = function () {
                    let url = self.api.url(app, method);
                    request.post({
                        url: url,
                        form: list
                    }, function (err, res, body) {

                        // TODO Подсчёт задержки работает не совсем корректно
                        let res_time = Date.now();
                        let res_name = method.split('/');
                        console.log(res_name[0] + ': delay -', res_time - req_time, 'ms');
                        console.log(url);

                        if (err) return callback(err);
                        if (res.statusCode !== 200) return callback(res.statusCode);
                        try {
                            let data = JSON.parse(body);
                            if (data.error) return callback(data.error);
                            callback(null, data);
                        } catch (e) {
                            console.error(new Date() + '\nCan\'t parse JSON from message:\n', body);
                        }
                    })
                };
                if (app === 'tf') self.q_tf.addTask(f);
                if (app === 'go') self.q_go.addTask(f);
                if (app === 'dt') self.q_dt.addTask(f);
                if (app === 'gt') self.q_gt.addTask(f);
            },
            url: function (app, method) {
                return 'https://' + config.app[app] + '/api/' + method + '/?key=' + self.apikey;
            }
        }
    }

    get socket() {
        let self = this;
        return {
            connect: function () {
                console.log('');
                self.ws = new websocket('wss://wsn.dota2.net/wsn/');
                self.ws.on('open', function () {
                    console.log(new Date() + '\nConnected to WebSocket!');
                    self.emit('connected');
                    self.socket.auth();
                });
                self.ws.on('message', function (message) {
                    try {
                        if (message === 'pong') {
                            let pon = Date.now();
                            let ping = pon - pin;
                            if (ping > 100) console.log('PING -', ping, 'мс  |  ' + new Date());
                        } else {
                            message = JSON.parse(message);

                            // TODO Для прослушивания новых каналов и отладки, убрать
                            if (
                                message.type === 'newitems_tf'
                                ||
                                message.type === 'history_tf'
                                ||
                                message.type === 'invcache_tf'
                                ||
                                message.type === 'invcache_go'
                                ||
                                message.type === 'additem_tf'
                                ||
                                message.type === 'itemout_new_tf'
                                ||
                                message.type === 'itemstatus_tf'
                                ||
                                message.type === 'webnotify'
                                ||
                                message.type === 'money'
                            ) {
                            }
                            else console.error('движ', message);
                            // ///////////////////////////////////////////////////////

                            let arr = message.type.split('_');
                            if (arr.length > 1) {
                                let data = {};
                                data.data = JSON.parse(message.data);
                                let app = arr[arr.length - 1];
                                if (app === 'cs'
                                    // &&
                                    // arr[arr.length - 2] !== 'bets'
                                ) app = 'dt';
                                data.app = app;
                                let type = arr[0];
                                for (let i = 1; i < arr.length - 1; i++) {
                                    type = type + '_' + arr[i]
                                }
                                self.emit(type, data);
                            }
                            else self.emit(arr[0], JSON.parse(message.data));
                            // TODO не совсем понятно что и когда возвращает эмитер, то строку то объект
                        }
                    } catch (e) {
                        console.error(new Date() + '\n+Can\'t parse JSON from message:\n', message);
                    }
                });
                self.ws.on('error', function (error) {
                    console.error(new Date() + '\nFluffy', error)
                });
                self.ws.on('close', function () {
                    console.log('Reconnecting to WebSocket...'); // TODO Добавить таймаут на реконект, чтоб не ломился, если сайт не отвечает
                    clearInterval(ws_ping);
                    // clearInterval(api_ping);
                    self.socket.connect();
                });
            },
            auth: function () {
                let app = 'dt';
                self.api.call(app, 'GetWSAuth', function (err, data) {
                    if (err) return console.error(err);
                    let auth_key = data['wsAuth'];
                    console.log('Received WS Key ' + auth_key);
                    self.socket.send(auth_key);
                    self.api.call(app, 'PingPong');
                    global.ws_ping = setInterval(self.socket.ping, 30 * 1000);
                    // global.api_ping = setInterval(() => {self.api.call(app, 'PingPong')}, 150 * 1000);
                })
            },
            subscribe: function (channel) {
                self.socket.send(channel);
                console.log('Subscribed to channel: ' + channel);
            },
            send: function (data) {
                if (self.ws.readyState === 1) {
                    self.ws.send(data);
                }
            },
            ping: function () {
                global.pin = Date.now();
                self.socket.send('ping');
            }
        }
    }
}

require('util').inherits(Market, require('events').EventEmitter);

module.exports = Market;