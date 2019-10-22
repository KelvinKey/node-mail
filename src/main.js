'user strict'

const superagent = require('superagent');
const cheerio = require('cheerio');
const config = require('../config');

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const nodemailer = require('nodemailer');


// 方法对象
const par = {

    /**Get ONE content */
    getOneData: () => {
        return new Promise((resolve, reject) => {
            superagent.get(config.OneUrl).end((err, res) => {
                if (err) {
                    reject(err);
                }
                let $ = cheerio.load(res.text);
                let _Ones = $(`#carousel-one .carousel-inner .item`)[0];
                let _data = {
                    imgsrc: $(_Ones)
                        .find(`.fp-one-imagen`)
                        .attr(`src`),
                    type: $(_Ones)
                        .find(`.fp-one-imagen-footer`)
                        .text()
                        .trim(),
                    text: $(_Ones)
                        .find(`.fp-one-cita`)
                        .text()
                        .trim()
                };
                resolve(_data);
            });
        });
    },

    /**Get Weather Tips */
    getWeatherTips: () => {
        return new Promise((resolve, reject) => {
            superagent.get(config.WeatherUrl + config.local).end((err, res) => {
                if (err) {
                    reject(err);
                }
                let weatherTip = ``;
                let $ = cheerio.load(res.text);
                $(`.wea_tips`).each((i, elem) => {
                    weatherTip = $(elem)
                        .find(`em`)
                        .text();
                });
                resolve(weatherTip);
            });
        });
    },

    /**Get the weather forecast */
    getWeatherData: () => {
        return new Promise((resolve, reject) => {
            superagent.get(config.WeatherUrl + config.local).end((err, res) => {
                if (err) {
                    reject(err);
                }
                let _Data = [];
                let $ = cheerio.load(res.text);
                $(`.forecast .days`).each((i, elem) => {
                    const SingleDay = $(elem).find("li");
                    _Data.push({
                        Day: $(SingleDay[0])
                            .text()
                            .trim(),
                        WeatherImgUrl: $(SingleDay[1])
                            .find("img")
                            .attr("src"),
                        WeatherText: $(SingleDay[1])
                            .text()
                            .trim(),
                        Temperature: $(SingleDay[2])
                            .text()
                            .trim(),
                        WindDirection: $(SingleDay[3])
                            .find("em")
                            .text()
                            .trim(),
                        WindLevel: $(SingleDay[3])
                            .find("b")
                            .text()
                            .trim(),
                        Pollution: $(SingleDay[4])
                            .text()
                            .trim(),
                        PollutionLevel: $(SingleDay[4])
                            .find("strong")
                            .attr("class")
                    });
                });
                resolve(_Data);
            });
        });
    },

    /**Main */
    getAllDataMain: () => {
        // how long with
        let today = new Date();
        let initDay = new Date(config.startDay);
        Promise.all([par.getOneData(), par.getWeatherTips(), par.getWeatherData()]).then(data => {
            par.getHtmlData = {
                lastDay: Math.floor((today - initDay) / 1000 / 60 / 60 / 24),
                todaystr: today.getFullYear() + " / " + (today.getMonth() + 1) + " / " + today.getDate(),
                todayOneData: data[0],
                weatherTip: data[1],
                threeDaysData: data[2]
            }
            par.sendMail(par.getHtmlData);
        }).catch(err => {
            console.log(`获取数据失败 :`, err);
        })
    },

    /** ejs */
    sendMail: ($params) => {
        const template = ejs.compile(fs.readFileSync(path.resolve(__dirname, "email.ejs"), "utf8"));

        let transporter = nodemailer.createTransport({
            service: 'qq',
            port: 465,
            secureConnection: true,
            auth: config.EamilAuth
        });

        let mailOptions = {
            from: config.EamilAuth.user,
            to: config.EmailTo,
            subject: config.EmailSubject,
            html: template($params)
        };

        transporter.sendMail(mailOptions, (error, info = {}) => {
            if (error) {
                console.log(error);
            }
            console.log("-------------邮件发送成功--------------", info.messageId);
        });

    },

    /**public */
    getHtmlData: {}
}

par.getAllDataMain();
