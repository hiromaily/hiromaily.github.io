/** 
 * @Common class :
 * @description This script need to use jQuery ver1.7.1
 */
(function() {
  //'use strict';
  /* private */
  var private1 = "private content";
  var s_time = 0;
	
  /* public */
  com = { // グローバル名前空間オブジェクト
		isWebKitTransform3d_ : ('WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix()),
		isTransform_         : false,
		prefix_              : "",
    //return isTransform
    checkTransform_ : function(){
      var propList = [
                      'transform',
                      'webkitTransform',
                      'MozTransform',
                      'mozTransform',
                      'oTransform',
                      'msTransform'];
      var div = document.createElement('div');
      var css = div.style;
      //ベンダープレフィックス取得
      for (var i = 0, l = propList.length; i < l; i++) {
        if (css[propList[i]] !== undefined) {
          this.prefix_ = ('-' + propList[i].replace(/Transform/g, '-')).toLowerCase();//指定した文字列を小文字に変換
          return true;
        }
      }
      return false;				
    },
    /**
     * @name chkProperty
     * @param propList 
     * @return {Object.result(Boolean)} match result.
     * @return {Object.property} matched property.
     */
    //CSSのプロパティがあるかどうかチェック。
    chkProperty_ : function(propList){
      var div = document.createElement('div'),
          css = div.style,
          property = '',
          result = false;
      for (var i = 0, l = propList.length; i < l; i++) {
        if (css[propList[i]] !== undefined) {
          property = propList[i];
          result = true;
          break;
        }
      }
      return {
        result: result,
        property: property
      };
    },
    /**
     * 
     * @name getDuration
     * @function
     * @param target 
     * @return {String / Number} value of transiton duration.
     */
    //duration 取得
    getDuration_ : function(targert){
      var duration,
          property = '',
          propList = [
                'transitionDuration',
                'webkitTransitionDuration',
                'MozTransitionDuration',
                'mozTransitionDuration',
                'oTransitionDuration',
                'msTransitionDuration'
          ],
          prop = chkProperty(propList).property;
      //指定した要素(ここではtarget)がどんなスタイルで表示されているかを知るために、計算済みスタイルを取得
      duration = document.defaultView.getComputedStyle(target, '')[prop];
      return {
          property: prop,
          time: duration
      }
    },
    //check Android
    checkAndroid_ : function(){
      var error_no = "0";
      if (!(('createTouch' in document) || ('ontouchstart' in document))) error_no += "1";
      if (navigator.platform.indexOf("Linux") == -1) error_no += "2";
      if (window.orientation === undefined) error_no += "3";

      var orient_count = 0;
      for(var i in document.all){
        if(document.all[i].text != null){
          if(document.all[i].text.indexOf("orientation") != -1){
            orient_count+=1;
            if(orient_count > 1){
              error_no += "4";
              break;
            }
          }
        }
      }
      
      //try{ //chrome以外はエラーが発生 Android4.0以降はエラーが発生しないので除外
      //  if (chrome) error_no += "5";
      //}catch(e){}
      var count = 0;
      for(var i in document.all){
        if(document.all[i].text != null){
          if(document.all[i].text.indexOf("window.chrome = null;") != -1){
            count+=1;
            if(count > 1){
              error_no += "6";
              break;
            }
          }
        }
      }
      for(var i = 0; i < document.documentElement.childNodes.length; i++){
        if(document.documentElement.childNodes[i].type != undefined){
          error_no += "7";
          break;
        }
      }

      if(typeof activity != 'undefined'){
        if(typeof activity.onDestroy == 'undefined') error_no += "8";
      }
      //Android Version
      var ua = navigator.userAgent.match(/android (\d+\.\d+)/i);
      if (!!ua) var os = ua[1];
      else      var os = 0;

      var flash = 0;
      if (!!ua && (os >= 2.1)){
        //Flash Version
        var plugins = navigator.plugins;
        for (key in plugins) {
          var description = (plugins[key]['description'] || '').match(/shockwave flash (\d+\.\d+)/i);
          if (!!description && (description[1] >= 10.1)) {
            flash = description[1];
          }
        }
      }
      
      return {
        result: (error_no=="0")? true:false,
        version: os,
        flash: flash,
        debug_code: error_no
      };
    },
    //check iPhone
    checkiPhone_ : function(){
      var error_no = "0";
      if (!(('createTouch' in document) || ('ontouchstart' in document))) error_no += "1";
      if (!(navigator.platform.indexOf("iPhone") != -1 || 
            navigator.platform.indexOf("iPad") != -1 || 
            navigator.platform.indexOf("iPod") != -1)) error_no += "2";
      if (window.orientation === undefined) error_no += "3";
      var orient_count = 0;
      for(var i in document.all){
        if(document.all[i].text != null){
          if(document.all[i].text.indexOf("orientation") != -1){
            orient_count+=1;
            if(orient_count > 1){
              error_no += "4";
              break;
            }
          }
        }
      }
      
      //try{ //chrome以外はエラーが発生 Android4.0以降はエラーが発生しないので除外
      //  if (chrome) error_no += "5";
      //}catch(e){}
      var count = 0;
      for(var i in document.all){
        if(document.all[i].text != null){
          if(document.all[i].text.indexOf("window.chrome = null;") != -1) count+=1;
        }
      }
      if(count > 1) error_no += "6";

      for(var i = 0; i < document.documentElement.childNodes.length; i++){
        if(document.documentElement.childNodes[i].type != undefined){
          error_no += "7";
          break;
        }
      }
      //iOS Version
      var ua = navigator.userAgent;
      ua.match(/iPhone OS (\w+){1,3}/g);
      var os = (RegExp.$1.replace(/_/g, '')+'00').slice(0,3);
      
      return {
        result: (error_no=="0")? true:false,
        version: os,
        debug_code: error_no
      };
    },
    //sleep
    sleep_ : function(time){
      var d1 = new Date().getTime();
      var d2 = new Date().getTime();
      while (d2 < d1 + time) {
        d2 = new Date().getTime();
      }
      return;
    },
    //debug start
    debugStart_ : function(){
      s_time = (new Date).getTime();
    },
    //debug end
    debugEnd_ : function(){
      var e_time = (new Date).getTime();
      var result = e_time - s_time;
      return result;
    }
    //iOS & android check function add!! 
  };
  //initial
  com.isTransform_ = com.checkTransform_();
})();
