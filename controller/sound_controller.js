const Sound = require('../models/sound_model');
const User = require('../models/user_model');
const Like = require('../models/like_model');
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path');
const { BADNAME } = require('dns');
const { request } = require('http');
const { response } = require('express');
const { paginate } = require('mongoose-paginate-v2');
const ObjectId = require("mongoose").Types.ObjectId;
require('dotenv').config();



const MY_SECRET_KEY = process.env.SECRET_KEY


exports.upload =  async (request, response) => {

    const { soundName,category, tags } = request.body

    const soundfile = request.file

    var { token } = request.headers        

    var decoded_token = jwt.verify(token, MY_SECRET_KEY); // 토큰 디코드
    if (!soundfile) return response.send("파일을 업로드 해주세요.");
    if (decoded_token) {
        var user = await User.findOne({_id:decoded_token.user}) // 디코드 토큰 값을 User._id 찾아온다
        var accountId = user._id
        var fileName = soundfile.filename 
        var filePath =  `https://jungganzi.xyz/api/get/file/${fileName}`; // 파일경로 설정  해당경로에 접속시 해당 파일 열어볼수있게 
        var savestatus = await { accountId, soundName, category, tags, fileName, filePath  }
        var sound = await new Sound(savestatus) // formdata 라 json 형태로 못받고 몽고db쿼리문째로 response
        sound.created = Date.now()
    
        sound.save()
        return response.send({
            result:"파일이 업로드 되었습니다.",
            sound,
        })
    } 
}



exports.remove =  async (request, response) => {

    var { soundId } = request.body

    var token = request.headers.token  

    var decoded_token = jwt.verify(token, MY_SECRET_KEY);
    
    if (decoded_token) {
        var user = await User.findOne({_id:decoded_token.user})
        var sound = await Sound.findOneAndDelete({accountId:user, _id:soundId})
        return response.send({sound})
    } 
}  // swagger response 형태가 맘에안듬 후순위


exports.getsoundlist =  async (request, response) => {

    var token = request.headers.token  

    
    const { next, previous } = request.query

    // const query = {}  // pagianate promise usage 존재
    
    const myCustomLabels = {  // 커스텀으로 생성가능하지만 여기서는 하지않음
        totalDocs: false,
        docs: 'result',
        limit: false,
        page: false,
        nextPage: 'next',
        prevPage: 'previous',
        hasNextPage: 'hasNext',
        hasPrevPage : 'hasPrevious',
        pagingCounter : false,
        totalPages: false,
        meta: 'paginator',
    }

    // 클라단에서 무한스크롤링을 구현하기위해 next  페이징 이동구현

    var popul = ({ path: 'accountId',
        select: 'accountEmail accountName accountImg' }); // populate options 

    const options = {
        page : parseInt(next, 10) || 1,
        limit: 10,
        customLabels: myCustomLabels, // 커스텀 생성시 추가내역
        sort: {created: -1 },
        populate: popul,
        nextPage : 0
    };

    if (!token) {
        var updateall = await Sound.updateMany({$set : {isLiked:false}})
        var docs = await Sound.paginate({}, options, next, previous)
        var totalCount = await Sound.countDocuments()
        var result = await docs.result
        var paginator = await docs.paginator
        var list =  { totalCount , result, paginator }
        console.log("empty token", updateall)
        response.send(list)
    };

    if (token) {
        var decoded_token = jwt.verify(token, MY_SECRET_KEY);
        var updateall = await Sound.updateMany({$set : {isLiked:false}})
        var mylike = await Like.find({accountId:decoded_token.user, isDeleted: false}).select('-_id soundId') // _id 빼기위해 - 설정
        var soundIds = mylike.map((s) => s.soundId)
        var update = await Sound.updateMany({ _id : {$in : soundIds}},{$set : {isLiked:true}})
        var docs = await Sound.paginate({}, options, next, previous)
        var totalCount = await Sound.countDocuments()
        var result = await docs.result
        var paginator = await docs.paginator
        var list =  { totalCount , result, paginator }
        console.log(updateall)
        console.log(update)
        return response.send(list)
    }
}                                 


exports.getmysoundlist =  async (request, response) => {

    var token = request.headers.token  

    var decoded_token = jwt.verify(token, MY_SECRET_KEY);   

    const { next, previous } = request.query

    const myCustomLabels = {  // 커스텀으로 생성가능하지만 여기서는 하지않음
        totalDocs: false,
        docs: 'result',
        limit: false,
        page: false,
        nextPage: 'next',
        prevPage: 'previous',
        hasNextPage: 'hasNext',
        hasPrevPage : 'hasPrevious',
        pagingCounter : false,
        totalPages: false,
        meta: 'paginator',
    }

    var popul = ({ path: 'accountId',
        select: 'accountEmail accountName accountImg' }); // populate options

    const options = {
        page : parseInt(next, 10) || 1,
        limit: 10,
        customLabels: myCustomLabels,
        sort: {created: -1 },
        populate: popul,
    };                                    

    if (decoded_token) {
        var decoded_token = jwt.verify(token, MY_SECRET_KEY);
        var updateall = await Sound.updateMany({$set : {isLiked:false}})
        var mylike = await Like.find({accountId:decoded_token.user, isDeleted: false}).select('-_id soundId') // _id 빼기위해 - 설정
        var soundIds = mylike.map((s) => s.soundId)
        var update = await Sound.updateMany({ _id : {$in : soundIds}},{$set : {isLiked:true}})
        var docs = await Sound.paginate({}, options, next, previous)
        var totalCount = await Sound.countDocuments()
        var result = await docs.result
        var paginator = await docs.paginator
        var list =  { totalCount , result, paginator }
        console.log(updateall)
        console.log(update)
        return response.send(list)
    }
} 


exports.search =  async (request, response) => {

    const { keyword, next, previous } = request.query

    const myCustomLabels = {  // 커스텀으로 생성가능하지만 여기서는 하지않음
        totalDocs: false,
        docs: 'result',
        limit: false,
        page: false,
        nextPage: 'next',
        prevPage: 'previous',
        hasNextPage: 'hasNext',
        hasPrevPage : 'hasPrevious',
        pagingCounter : false,
        totalPages: false,
        meta: 'paginator',
    }

    const options = {
        page : parseInt(next, 10) || 1,
        limit: 10,
        customLabels: myCustomLabels,
        sort: {created: -1 },
    };                           

    if (keyword) {
        var docs = await Sound.paginate({$or: [{ tags: new RegExp(keyword)},{ soundName: new RegExp(keyword)},{ category: new RegExp(keyword)}  ] }, options, next, previous )
        var totalCount = await Sound.countDocuments({$or: [{ tags: new RegExp(keyword)},{ soundName: new RegExp(keyword)},{ category: new RegExp(keyword)}  ] })
        var result = await docs.result
        var paginator = await docs.paginator
        var list =  { totalCount , result, paginator }
        response.send(list)
    }
} 

exports.mylike =  async (request, response) => { // 토탈카운드 isDeleted false 인것만 
    var { token } = request.headers 

    var decoded_token = jwt.verify(token, MY_SECRET_KEY);

    const { next, previous } = request.query


    const myCustomLabels = {  // 커스텀으로 생성가능하지만 여기서는 하지않음
        totalDocs: false,
        docs: 'result',
        limit: false,
        page: false,
        nextPage: 'next',
        prevPage: 'previous',
        hasNextPage: 'hasNext',
        hasPrevPage : 'hasPrevious',
        pagingCounter : false,
        totalPages: false,
        meta: 'paginator',
    }

    var popul = ({ path: 'accountId', select: 'accountEmail accountName accountImg '});
    const options = {
        page : parseInt(next, 10) || 1,
        limit: 10,
        customLabels: myCustomLabels,
        sort: {created: -1 },
        populate: popul,
    };                                       

    if (decoded_token) {
        var mylike = await Like.find({accountId:decoded_token.user, isDeleted: false}).select('-_id soundId') // _id 빼기위해 - 설정
        var soundIds = mylike.map((s) => s.soundId)
        var docs = await Sound.paginate({ _id : {$in : soundIds}, isLiked:true}, options, next, previous, {sort: {created : -1}})
        var totalCount = await Sound.countDocuments({ _id : {$in : soundIds}, isLiked:true})
        var result = await docs.result
        var paginator = await docs.paginator
        var list =  { totalCount , result, paginator }

        response.send(list)
    }
}

exports.file_path = async (request, response, next) => {
    var { fileName } = request.params;
    var filePath = path.resolve(__dirname, "../soundsfiles/" + fileName );

    return response.sendFile(filePath)
}
