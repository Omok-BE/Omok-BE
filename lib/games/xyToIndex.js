// x,y 좌표를 배열의 index값으로 변환
module.exports.xyToIndex = ({ x, y }) => {
    return x + y * 19;
};