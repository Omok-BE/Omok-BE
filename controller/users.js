const User = require('../models/users');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const signup = async (req, res) => {
  try {
    const { id, pass, confirmPass, profileImage } = req.body;
    // 비밀번호, 비밀번호 확인 비교
    if (pass !== confirmPass) {
      res.status(400).send({
        ok: false,
        errorMessage: '회원가입 실패: 비밀번호가 일치하지 않습니다',
      });
      return;
    }
    // id 존재검사
    const existId = await User.find({ id });
    if (existId.length) {
      res.status(400).send({
        ok: false,
        errorMessage: '이미 사용중인 ID입니다.',
      });
      return;
    }
    // if(!profileImage){
    //     res.status(400).send({
    //         ok: 'false',
    //         errorMessage: '프로필을 선택하지 않았습니다.'
    //     });
    // }else {
    //     profileUrl = 'http://15.165.158.25/images/'+ profileImage + '.svg'
    // }


    const encodedPass = crypto
      .createHash(process.env.Algorithm)
      .update(pass + process.env.salt)
      .digest('base64');

    const user = new User({
      id: id,
      pass: encodedPass,
      score: [{ win: 0 }, { lose: 0 }],
      point: 1000,
      state: 'offline',
    //   profileImage: profileUrl,
    });
    await user.save();

    res.status(201).send({
      ok: true,
      message: '회원가입 성공',
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      errorMessage: '요청한 데이터 형식이 올바르지 않습니다',
    });
  }
};

const login = async (req, res) => {
  try {
    const { id, pass } = req.body;
    const encodedPass = crypto
      .createHash(process.env.Algorithm)
      .update(pass + process.env.salt)
      .digest('base64');
    const user = await User.findOne({ id });

    if (!user || encodedPass !== user.pass) {
      res.status(400).send({
        errorMessage: '아이디 또는 패스워드를 확인해주세요',
      });
      return;
    }
    const token = jwt.sign({ id: user.id }, process.env.TOKENKEY);
    //user state값 online으로 만들어주는거
    if (token) {
      await User.updateOne({ id: user.id }, { $set: { state: 'online' } });
    }
    res.send({
      token,
      id: id,
      ok: true,
      message: '로그인 성공',
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      errorMessage: '요청한 데이터 형식이 올바르지 않습니다.',
    });
  }
};

const userinfo = async (req, res) => {
  try {
    const { id } = req.params;

    const userinfo = await User.findOne({ id });
    res.send({
      id: userinfo.id,
      nickname: userinfo.nickname,
      score: userinfo.score,
      point: userinfo.point,
      state: userinfo.state,
      profileImage: userinfo.profileImage,
    });
  } catch (err) {
    console.log(err);
    res.status(401).send({
      errorMessage: '/로그인 체크 err',
    });
  }
};

module.exports = {
  signup,
  login,
  userinfo,
};
