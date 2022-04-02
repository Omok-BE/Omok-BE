const { xyToIndex } = require('./xyToIndex')

//오목 33
module.exports.check_33 = ( x,  y, board ) => {
	let count3 = 0;
	// 가로체크.
	if ((board[xyToIndex(x - 3 , y)] == -1 && board[xyToIndex(x -2 , y)] ==1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x + 1 , y)] == -1) ||
		(board[xyToIndex(x -2 , y)] == -1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x +2 , y)] == -1) ||
		(board[xyToIndex(x - 1 , y)] == -1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x +2 , y)] ==1 && board[xyToIndex(x + 3 , y)] == -1) ||
		(board[xyToIndex(x - 4 , y)] == -1 && board[xyToIndex(x - 3 , y)] ==1 && board[xyToIndex(x -2 , y)] ==1 && board[xyToIndex(x - 1 , y)] == -1 && board[xyToIndex(x + 1 , y)] == -1) ||
		(board[xyToIndex(x + 4 , y)] == -1 && board[xyToIndex(x + 3 , y)] ==1 && board[xyToIndex(x +2 , y)] ==1 && board[xyToIndex(x + 1 , y)] == -1 && board[xyToIndex(x - 1 , y)] == -1) ||
		(board[xyToIndex(x -2 , y)] == -1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x + 1 , y)] == -1 && board[xyToIndex(x +2 , y)] ==1 && board[xyToIndex(x + 3 , y)] == -1) ||
		(board[xyToIndex(x +2 , y)] == -1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x - 1 , y)] == -1 && board[xyToIndex(x -2 , y)] ==1 && board[xyToIndex(x - 3 , y)] == -1))
		count3++;
	// 세로체크. 
	if ((board[xyToIndex(x , y - 3)] == -1 && board[xyToIndex(x , y -2)] ==1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y + 1)] == -1) ||
		(board[xyToIndex(x , y -2)] == -1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y +2)] == -1) ||
		(board[xyToIndex(x , y - 1)] == -1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y +2)] ==1 && board[xyToIndex(x , y + 3)] == -1) ||
		(board[xyToIndex(x , y - 4)] == -1 && board[xyToIndex(x , y - 3)] ==1 && board[xyToIndex(x , y -2)] ==1 && board[xyToIndex(x , y - 1)] == -1 && board[xyToIndex(x , y + 1)] == -1) ||
		(board[xyToIndex(x , y + 4)] == -1 && board[xyToIndex(x , y + 3)] ==1 && board[xyToIndex(x , y +2)] ==1 && board[xyToIndex(x , y + 1)] == -1 && board[xyToIndex(x , y - 1)] == -1) ||
		(board[xyToIndex(x , y -2)] == -1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y + 1)] == -1 && board[xyToIndex(x , y +2)] ==1 && board[xyToIndex(x , y + 3)] == -1) ||
		(board[xyToIndex(x , y +2)] == -1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y - 1)] == -1 && board[xyToIndex(x , y -2)] ==1 && board[xyToIndex(x , y - 3)] == -1))
		count3++;
	// 대각선체크. 
	if ((board[xyToIndex(x - 3 , y - 3)] == -1 && board[xyToIndex(x -2 , y -2)] ==1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x + 1 , y + 1)] == -1) ||
		(board[xyToIndex(x -2 , y -2)] == -1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x +2 , y +2)] == -1) ||
		(board[xyToIndex(x - 1 , y - 1)] == -1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x +2 , y +2)] ==1 && board[xyToIndex(x + 3 , y + 3)] == -1) ||
		(board[xyToIndex(x - 3 , y - 3)] == -1 && board[xyToIndex(x -2 , y -2)] ==1 && board[xyToIndex(x - 1 , y - 1)] == -1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x +2 , y +2)] == -1) ||
		(board[xyToIndex(x + 3 , y + 3)] == -1 && board[xyToIndex(x +2 , y +2)] ==1 && board[xyToIndex(x + 1 , y + 1)] == -1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x -2 , y -2)] == -1) ||
		(board[xyToIndex(x - 4 , y - 4)] == -1 && board[xyToIndex(x - 3 , y - 3)] ==1 && board[xyToIndex(x -2 , y -2)] ==1 && board[xyToIndex(x - 1 , y - 1)] == -1 && board[xyToIndex(x + 1 , y + 1)] == -1) ||
		(board[xyToIndex(x + 4 , y + 4)] == -1 && board[xyToIndex(x + 3 , y + 3)] ==1 && board[xyToIndex(x +2 , y +2)] ==1 && board[xyToIndex(x + 1 , y + 1)] == -1 && board[xyToIndex(x - 1 , y - 1)] == -1))
		count3++;
	// 반대 대각선체크. 
	if ((board[xyToIndex(x + 3 , y - 3)] == -1 && board[xyToIndex(x +2 , y -2)] ==1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x - 1 , y + 1)] == -1) ||
		(board[xyToIndex(x +2 , y -2)] == -1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x -2 , y +2)] == -1) ||
		(board[xyToIndex(x + 1 , y - 1)] == -1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x -2 , y +2)] ==1 && board[xyToIndex(x - 3 , y + 3)] == -1) ||
		(board[xyToIndex(x + 3 , y - 3)] == -1 && board[xyToIndex(x +2 , y -2)] ==1 && board[xyToIndex(x + 1 , y - 1)] == -1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x -2 , y +2)] == -1) ||
		(board[xyToIndex(x - 3 , y + 3)] == -1 && board[xyToIndex(x -2 , y +2)] ==1 && board[xyToIndex(x - 1 , y + 1)] == -1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x +2 , y -2)] == -1) ||
		(board[xyToIndex(x + 4 , y - 4)] == -1 && board[xyToIndex(x + 3 , y - 3)] ==1 && board[xyToIndex(x +2 , y -2)] ==1 && board[xyToIndex(x + 1 , y - 1)] == -1 && board[xyToIndex(x - 1 , y + 1)] == -1) ||
		(board[xyToIndex(x - 4 , y + 4)] == -1 && board[xyToIndex(x - 3 , y + 3)] ==1 && board[xyToIndex(x -2 , y +2)] ==1 && board[xyToIndex(x - 1 , y + 1)] == -1 && board[xyToIndex(x + 1 , y - 1)] == -1))
		count3++;
	if (count3 > 1) return 1;
	else return 0;
}