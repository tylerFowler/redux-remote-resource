const failTest = t => error => { t.fail(error); t.end(); };
const nest = name => `  -> ${name}`;

export { failTest, nest };
