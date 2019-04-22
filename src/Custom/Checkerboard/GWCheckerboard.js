

/**
 *
 * 棋盘基础类/地图类
 *
 * */


//其他层枚举
var EnemuOtherLayer = {
    MOVE    :0, //移动层
    SUMMON  :1, //召唤层
    ALL     :99,//all
};


var GWCheckerboard = cc.TMXTiledMap.extend({
    camp_Type                   : "",   //当前阵营
    tmxBgLayer                  : null, //bg 层
    selectChess                 : null, //选中棋子
    selectHandCard              : null, //选中牌

    tiledMapRectArray           : [],   //地图rect数组，存储瓦片的rect信息
    tiledMapLeaveArray          : [],   //地图映射数组，存储瓦片的占用状态，有无棋子等等
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    arrayFriendsSurvivalChess   : [],   //我方存活棋子Array
    arrayEnemySurvivalChess     : [],   //敌方存活棋子Array

    arraySummonLayerInMap       : [],   //临时-召唤区域layer数组
    arrayMoveLayerInMap         : [],   //临时-移动区域layer数组

    ctor: function (){
        //数据初始化
        this.camp_Type      = "";
        this.tmxBgLayer     = null;
        this.selectChess    = null;
        this.selectHandCard = null;

        this.tiledMapRectArray  = [];
        this.tiledMapLeaveArray = [];
        this.arrayFriendsSurvivalChess  = [];
        this.arrayEnemySurvivalChess    = [];
        this.arraySummonLayerInMap      = [];
        this.arrayMoveLayerInMap        = [];
        //模拟数据
        this.camp_Type = CampEnemu.BLACK;   //默认黑色持方  >>初始化我方持方
        //地图构造
        this._super(res.bg5x5_tmx);
        //其他构造
        this.loadTiledMap();
        this.loadMapRectArray();    // 地图区域 rect
        this.loadMapLeaveArray(); // 瓦片地图区域映射
        return true;
    },
    // 瓦片地图区域[二维区域] -old
    loadTiledMap:function () {
        this.setAnchorPoint(0,0);
        this.tmxBgLayer = this.getLayer("bg");
        MAPSH = this;
    },
    // 地图rect数组初始化
    loadMapRectArray:function(){
        var tileSizeWidth = this.tmxBgLayer.getMapTileSize().width;     //瓦片宽度
        var tileSizeHeight = this.tmxBgLayer.getMapTileSize().height;   //瓦片高度
        //< * 初始化 * >
        //[进入二层循环 第一层：j为Y轴]
        // for(var j = 0;j< this.tmxMap.getMapSize().height;j++) {
        for(var j = 0;j< this.getMapSize().height;j++) {
            this.tiledMapRectArray[j] = [];
            //[第二层：i为X轴]
            // for(var i = 0; i< this.tmxMap.getMapSize().width;i++){
            for(var i = 0; i< this.getMapSize().width;i++){
                this.tiledMapRectArray[j][i] = cc.rect(
                    this.x + i * tileSizeWidth,
                    this.y + j * tileSizeHeight,
                    tileSizeWidth,
                    tileSizeHeight
                );
            }
        }
    },
    // 地图映射数组
    loadMapLeaveArray:function(){
        var mapSize = this.getMapSize();
        for (var i = 0; i < mapSize.height; i++) {
            this.tiledMapLeaveArray[i] = [];
            for (var j = 0; j < mapSize.width; j++) {
                this.tiledMapLeaveArray[i][j] = CampEnemu.NONE;//每个瓦片当前的状态为空
            }
        }
    },
    //  <*独立方法*>
    // 初始化棋盘 -水晶/国王
    initGameCrystal:function () {
        //模拟位置
        var selfkingPos = {x:4,y:0};
        var otherkingPos = {x:4,y:8};
        //我方水晶
        var selfking = GWPiece.initPiece(ChessTypeEnemu.CRYSTAL);
        this.addChild(selfking,LocalZorderEnemu.CHESS);
        this.arrayFriendsSurvivalChess.push(selfking);//加入队友棋子
        this.tiledMapLeaveArray[selfkingPos.x][selfkingPos.y] = CampEnemu.BLACK;//映射地图
        selfking.joinInMap(selfkingPos.x,selfkingPos.y,ChessAnimeEnemu.FADEIN);//加入到4，0，淡出
        //敌方水晶
        var otherking = GWPiece.initPiece(ChessTypeEnemu.CRYSTAL);
        this.addChild(otherking,LocalZorderEnemu.CHESS);
        this.arrayEnemySurvivalChess.push(otherking);//加入敌方棋子
        this.tiledMapLeaveArray[otherkingPos.x][otherkingPos.y] = CampEnemu.WHITE;
        otherking.joinInMap(otherkingPos.x,otherkingPos.y,ChessAnimeEnemu.FADEIN);
        //颜色设置
        otherking.setColor(cc.color(100,100,100));
    },

    //  <*独立方法*>
    pickUpCardInHand:function(card){
        cc.log("pickUpCardInHand");
        this.selectHandCard = card;
        this.drawMapCurrentSummonLayer();
        this.eventTouchPickUpCardInHandAction(card);
    },
    // 取消选中
    cancelPickUpCardInHand:function(){
        cc.log("cancelPickUpCardInHand");
        this.restoreScene();
    },


    /**
     * touch event 用于上层方法传递事件
     * */

    //还原场景
    restoreScene:function(){
        this.removeMapLayerArray();
        //如果有选中棋子-> 还原
        if(this.selectChess != null){
            this.selectChess.pickDown();
            this.selectChess = null;
        }
        //如果有
        if(this.selectHandCard != null){
            this.selectHandCard = null;
        }
    },

    //touch event
    onTouchBegan:function (touch,event) {
        // return this.customOnTouchBegan(touch,event);// false 会使点击失败
    },
    onTouchMoved:function (touch,event) {
        // this.cunstomOnTouchMoved(touch,event);
    },
    onTouchEnded:function (touch,event) {
        var self = (event === undefined)? this : event.getCurrentTarget();  //当前主体
        var posInNode = self.convertToNodeSpace(touch.getLocation());       //在当前node中 点击位置
        var rect = cc.rect(0,0,self.width,self.height); //在当前坐标系中允许点击的范围


        if(!(cc.rectContainsPoint(rect,posInNode))){    //判断是否在允许的点击范围内
            self.restoreScene();//还原操作
            return false;//不合法直接return
        }

        //点击结果
        var result = self.getInfoFromMapByPos(posInNode.x, posInNode.y);//根据posInNode 获取瓦片信息
        if (result.isInMap) {// 触摸到地图区域内

            //说明需要召唤
            if(this.selectHandCard != null){
                //判断是否在召唤区域中
                if(self.resultContainsSummonLayer(result)){
                    var layerRect = self.tiledMapLeaveArray[result.cel][result.row];//取出目标区域映射
                    if(layerRect == CampEnemu.BLACK){//目标区域有黑方棋子，不允许召唤
                        cc.log("目标区域有黑方棋子，不允许召唤");
                        this.eventTouchSummonChessAction(0);//传出回调
                    }else if(layerRect == CampEnemu.WHITE){//目标区域有白方棋子，不允许召唤
                        cc.log("目标区域有摆放棋子，不允许召唤");
                        this.eventTouchSummonChessAction(1);
                    }else{//CampEnemu.NONE //目标区域无棋子，允许召唤"
                        cc.log("目标区域无棋子，允许召唤：",layerRect);
                        /* 牌转化为棋子 */ /* 牌转化为棋子 */ /* 牌转化为棋子 */ /* 牌转化为棋子 */ /* 牌转化为棋子 */
                        //从原来scene移除
                        var chess = new GWMonster;//self.holder_Chess;
                        chess.removeFromParent();
                        // 加入到棋盘中
                        self.addChild(chess);//渲染层级有封装
                        this.arrayFriendsSurvivalChess.push(chess);//加入我方存活棋子
                        self.tiledMapLeaveArray[result.cel][result.row] =  CampEnemu.BLACK;
                        //棋子化处理 ->数据模拟
                        chess.setAnchorPoint(0.5,0.5);
                        chess.setScale(2);//放大
                        chess.movingDistance = 9;
                        chess.movingDirection = [1,1,1,1,1,1,1,1];
                        //更新Map中位置映射
                        chess.joinInMap(result.cel,result.row,ChessAnimeEnemu.FADEIN);
                        XCLog("leaveList:",self.tiledMapLeaveArray);
                        this.eventTouchSummonChessAction(2,chess);//召唤棋子
                    }
                }
            }
            //说明移动棋子
            if(self.selectChess != null){
                // self.restoreScene();//还原操作
                // 判断是否在移动区域中
                if(self.resultContainsMoveLayer(result)){
                    var layerRect = self.tiledMapLeaveArray[result.cel][result.row];//取出目标区域映射
                    if(layerRect == CampEnemu.BLACK){//目标区域有黑方棋子，不允许落子
                        cc.log("目标区域有我方棋子，不允许落子");
                        this.eventTouchMoveChessAction(0);//发出回调
                    }else if(layerRect == CampEnemu.WHITE){//"目标区域有对方棋子，不允许落子"
                        cc.log("目标区域有对方棋子，不允许落子");
                        this.eventTouchMoveChessAction(1);//发出回调
                    }else{//CampEnemu.NONE //目标区域无棋子，允许落子"
                        cc.log("目标区域无棋子，允许落子：",layerRect);
                        // <修改映射关系>
                        var chess = self.selectChess;
                        //原来位置
                        self.tiledMapLeaveArray[chess.chessInMapX][chess.chessInMapY] = CampEnemu.NONE;
                        //现在位置
                        self.tiledMapLeaveArray[result.cel][result.row] =  CampEnemu.BLACK;//
                        // 棋子移动
                        chess.moveInMap(result.cel,result.row);
                        XCLog("leaveList:",self.tiledMapLeaveArray);
                        this.eventTouchMoveChessAction(2,chess);
                    }
                    self.removeMapLayerArray();     //移除layer
                    self.selectChess.pickDown();   //取消棋子选中状态
                    self.selectChess = null;       //null化
                }
            }//未举起棋子&点击空白区域
            else if(self.tiledMapLeaveArray[result.cel][result.row] == CampEnemu.NONE){//点击空白区域
                this.eventTouchBlankAction();//发出回调
            }//未举起棋子&点击非空白区域  -->选中棋子
            else{
                self.restoreScene();//还原操作
                var currentChess = self.pickUpChessInMapPoint(posInNode);//根据posInNode获得当前选中棋子
                if(currentChess === undefined){
                    return ;//无棋子直接结束
                }
                //能到这里说有棋子
                currentChess.pickUp();//选中当前棋子
                self.selectChess = currentChess;//选中
                XCLog("leaveList:",self.tiledMapLeaveArray);//格式化打印棋盘状态
                //<不同棋子类型，操作不同>
                //基础类型棋子 点击后查看召唤区域
                if(currentChess.pieceType == PieceTypeEnemu.BASE || currentChess.pieceType == PieceTypeEnemu.BUILDING ){
                    // 绘制召唤区域
                    self.drawMapCurrentSummonLayer();
                    this.eventTouchChessAction(0,currentChess);
                }else{//其他类型棋子（目前是怪物类型） 点击后查看移动区域
                    // //绘制Move区域
                    self.drawChessMovingLayer(currentChess);
                    this.eventTouchChessAction(1,currentChess);
                }
            }
        }
    },

    //判断是否在召唤区域中
    resultContainsSummonLayer:function(result){
        for(var  i = 0 ,len = this.arraySummonLayerInMap.length; i < len ; i++){
            let pos = this.arraySummonLayerInMap[i].pos;//获取瓦片位置
            if(result.cel == pos.x && result.row == pos.y){//说明同一个瓦片
                return true;
            }
        }
        return false;
    },
    //判断是否在移动区域中
    resultContainsMoveLayer:function(result){
        for(var  i = 0 ,len = this.arrayMoveLayerInMap.length; i < len ; i++){
            let pos = this.arrayMoveLayerInMap[i].pos;//获取瓦片位置
            let hasPiece = this.arrayMoveLayerInMap[i].hasPiece;
            if(hasPiece){//如果有棋子，直接调入下一步
                continue;
            }
            if(result.cel == pos.x && result.row == pos.y){//说明同一个瓦片
                return true;
            }
        }
        return false;
    },
    //绘制当前召唤区域
    drawMapCurrentSummonLayer:function(){
        var result = [];
        cc.log(this.arrayFriendsSurvivalChess.length);
        // < 三层循环：>
        // < 循环体一：遍历友方棋子 ->获得所有友方棋子的可召唤位置list >
        for (var i = 0 ,len = this.arrayFriendsSurvivalChess.length; i < len;i++ ){
            let chess = this.arrayFriendsSurvivalChess[i];
            let ranges = chess.getSummonRange();//获取召唤区域
            // < 循环体二：遍历召唤位置list中的单格 >
            for (var j = 0,rangesLen = ranges.length; j < rangesLen ; j++){
                let rang = ranges[j];//获取召唤单格
                let isAllow = true;//默认允许加入

                // < 循环体三：1.遍历每当前结果list中是否重复 >
                //重复判断：
                for ( var r = 0,resultLen = result.length ; r < resultLen ;r++){
                    let hasRang = result[r];//<>
                    if(hasRang.posInMap.x == rang.x && hasRang.posInMap.y == rang.y ){
                        isAllow = false;
                        break;//相同则j++，跳出第3循环
                    }
                }
                //如果已经不合法了，直接跳过本次循环
                if(!isAllow){
                    continue;
                }
                // < 判断目标位置 是否存在棋子 >
                var leave = this.tiledMapLeaveArray[rang.x][rang.y];
                if(leave == CampEnemu.BLACK || leave == CampEnemu.WHITE){
                    isAllow = false;
                }
                //true，加入result
                if(isAllow){
                    result.push({   isAllow:true,
                                    posInMap:{
                                        x:rang.x,
                                        y:rang.y
                                    }
                                });
                }
            }
        }
        this.drawMapLayerArray(result,EnemuOtherLayer.SUMMON);
    },

    //绘制目标移动区域
    drawChessMovingLayer:function(chess){
        var result = [];
        var mappings = chess.getMovingRange();//获得移动区域
        // 过滤目标映射中，已含棋子的映射，将其标记，并返回// mappings目标格坐标list
        for( var i = 0 ; i < mappings.length ; i++ ){

            // < 判断 目标位置 -有无存活我方棋子 >
            var isSureChess = false;

            // < 利用映射 判断目标位置 是否存在棋子 >
            var leave = this.tiledMapLeaveArray[mappings[i].x][mappings[i].y];
            if( leave == CampEnemu.BLACK || leave == CampEnemu.WHITE ){
                isSureChess = true;
            }

            // 通过增量 计算得出映射 将映射传递
            result.push({   isAllow:!isSureChess,
                            posInMap:{
                                x:mappings[i].x,
                                y:mappings[i].y
                            }
                        });
        }
        this.drawMapLayerArray(result,EnemuOtherLayer.MOVE);
    },


    //绘制layer
    drawMapLayerArray:function(array,layerType ){
        //绘制
        for(var i = 0;i<array.length;i++){
            let pos = array[i].posInMap; //获取映射
            //要注意这里是x-y相反
            let rect = this.tiledMapRectArray[pos.y][pos.x];//通过映射获取rect

            let userColor = array[i].isAllow?ALLOWPLACE_COLOR:NOT_ALLOWPLACE_COLOR;

            var layer = new cc.LayerColor(userColor,
                // this.tmxMap.getTileSize().width,
                // this.tmxMap.getTileSize().height);
                this.getTileSize().width,
                this.getTileSize().height);
            layer.setPosition(rect.x,rect.y);

            if(layerType == EnemuOtherLayer.MOVE){
                this.arrayMoveLayerInMap.push({layer:layer,pos:pos,hasPiece:!array[i].isAllow});
            }
            else if(layerType == EnemuOtherLayer.SUMMON){
                this.arraySummonLayerInMap.push({layer:layer,pos:pos,hasPiece:!array[i].isAllow});
                layer.setColor(COLOR_ALLOWSUMMON);//修改颜色
            }
            this.addChild(layer,LAYER_LOCAL_ZORDER);
        }
    },

    //移除layer ->summon ->move
    removeMapLayerArray:function(layerType){
        //移除绘制
        if(layerType === undefined || layerType == EnemuOtherLayer.ALL || layerType == EnemuOtherLayer.MOVE){
            for(var i = 0;i< this.arrayMoveLayerInMap.length;i++){
                var layer = this.arrayMoveLayerInMap[i].layer;
                layer.removeFromParent();
            }
            this.arrayMoveLayerInMap = [];
        }
        if(layerType === undefined || layerType == EnemuOtherLayer.ALL || layerType == EnemuOtherLayer.SUMMON){
            for(var i = 0;i< this.arraySummonLayerInMap.length;i++){
                var layer = this.arraySummonLayerInMap[i].layer;
                layer.removeFromParent();
            }
            this.arraySummonLayerInMap = [];
        }
    },


    //传入点击位置
    pickUpChessInMapPoint:function(pos,y){
        var posInNode = new cc.p(0,0);
        if(y === undefined){
            posInNode = pos;
        }else{
            posInNode.x = pos;
            posInNode.y = y;
        }
        //<* 这里仅判断了我方数组 *>//<* 这里仅判断了我方数组 *>//<* 这里仅判断了我方数组 *>//<* 这里仅判断了我方数组 *>
        //<* 未来需要改进 *>//<* 未来需要改进 *>//<* 未来需要改进 *>//<* 未来需要改进 *>//<* 未来需要改进 *>//<* 未来需要改进 *>
        for (var i = 0;i < this.arrayFriendsSurvivalChess.length ; i++){
            var node = this.arrayFriendsSurvivalChess[i];
            cc.log("node ach:",node.anchorX,node.anchorY);
            //x: node.x + 修正
            //y: node.y + 修正
            //width: layer方格大小//防止由于ui导致点击困难
            var rect = new cc.rect(
                node.x - node.anchorX * this.tmxBgLayer.getMapTileSize().width,
                node.y - node.anchorY * this.tmxBgLayer.getMapTileSize().height,
                this.tmxBgLayer.getMapTileSize().width,
                this.tmxBgLayer.getMapTileSize().height);
            //判断是否在允许的点击范围内
            if(cc.rectContainsPoint(rect,posInNode)){
                return node;
            }
        }
    },


    // 根据坐标获取在地图中的信息 返回所点击的瓦片信息
    getInfoFromMapByPos : function(x, y){
        cc.assert(y !== undefined, "GPMainLayer.getInfoFromMapByPos(): Y坐标不能为空！");
        var isInMap = false;
        var index = {x : -1, y : -1};

        var rect = null;
        for (var i = 0; i < this.tiledMapRectArray.length; i++) {
            for (var j = 0; j < this.tiledMapRectArray[i].length; j++) {
                rect = this.tiledMapRectArray[i][j];
                if (cc.rectContainsPoint(rect, cc.p(x, y)))
                {
                    index.row = i;
                    index.cel = j;
                    index.x = rect.x;
                    index.y = rect.y;
                    isInMap = true;
                }
            }
        }
        return {
            isInMap : isInMap,
            row : index.row,  // 行
            cel : index.cel,  // 列
            x : index.x,
            y : index.y
        };
    },






    /**
     * Custom 自定义虚函数 用于重写or回调
     * */

    //触摸事件 - 召唤棋子回调
    eventTouchSummonChessAction:function(state){

    },
    //触摸事件 - 移动棋子回调
    eventTouchMoveChessAction:function(state){

    },
    //触摸事件 - 点击空白回调
    eventTouchBlankAction:function(){

    },
    //触摸事件 - 点击空白回调
    eventTouchChessAction:function(state){

    },
    //触摸事件 -手牌中选中手牌
    eventTouchPickUpCardInHandAction:function (chess) {

    },




});