const jwt = require('jsonwebtoken');
const User = require('../models/users');

module.exports = (req, res, next) => {
    const { authorization } = req.headers;
    const [tokenType, tokenValue] = authorization.split(' ');

    if(tokenType !== 'Bearer'){
        res.status(401).send({
            errMessage: '로그인 후 사용해 주세요.',
        });
        return;
    }

    try{
        const { id } = jwt.verify(tokenValue, process.env.TOKENKEY);
        User.findById(id).exec().then((user) => {
            res.locals.user = user;
            next();
        });
    }catch(err){
        res.status(401).send({
            errMessage: '로그인후 사용하세요.'
        });
        return;
    }
}