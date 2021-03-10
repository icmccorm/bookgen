
const successHeader = "[\x1b[32m OK \x1b[0m] -- ";
const neutralHeader = "[\x1b[35m MSG \x1b[0m] -- ";
const failHeader = "[\x1b[31m ERR \x1b[0m] -- ";
const warnHeader = "[\u001b[33m WAR \x1b[0m] -- ";

export const succ = (msg:string) => {
	console.log(successHeader + msg);
};

export const msg = (msg:string) => {
	console.log(neutralHeader + msg);
};

export const err = (msg:string) => {
	console.log(failHeader + msg);
};

export const warn = (msg: string) => {
	console.log(warnHeader + msg);
}