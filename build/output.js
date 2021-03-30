"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warn = exports.err = exports.msg = exports.succ = void 0;
var successHeader = "[\x1b[32m OK \x1b[0m] -- ";
var neutralHeader = "[\x1b[35m MSG \x1b[0m] -- ";
var failHeader = "[\x1b[31m ERR \x1b[0m] -- ";
var warnHeader = "[\u001b[33m WAR \x1b[0m] -- ";
var succ = function (msg) {
    console.log(successHeader + msg);
};
exports.succ = succ;
var msg = function (msg) {
    console.log(neutralHeader + msg);
};
exports.msg = msg;
var err = function (msg) {
    console.log(failHeader + msg);
};
exports.err = err;
var warn = function (msg) {
    console.log(warnHeader + msg);
};
exports.warn = warn;
