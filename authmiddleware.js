const jwt = require('jsonwebtoken')

function authmiddleware( req, res, next ){
    const token = req.headers.token

    if(! token){
        res.status(403).json({
            message:"token not found "
        })
        return;
    }
    const decoded = jwt.verify(token , "taskUGsecret")
    if(decoded.userId){
        req.userId = decoded.userId 
        next()
    }else{
        res.status(403).json({
            message:"userId not found"
        })
    }
}
module.exports = {
    authmiddleware
}