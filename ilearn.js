Object.extend = function(dest, ori){
    for(var member in ori) {
        dest[member] = ori[member];
    }
    return dest;
}

var Class = function(){
    var self = function(){
        this.init.apply(this, arguments);
    },
    members,
    parent;
    if (arguments.length == 1) {
        members = arguments[0];
    } else {
        parent = arguments[0];
        members = arguments[1];
    }
    if (parent) {
        Object.extend( self.prototype, parent.prototype );
        self.prototype.constructor = parent.prototype.init;
    }
    Object.extend(self.prototype, members);
    
    self.prototype.init = self.prototype.init || function(){};
    
    return self;
}

Function = Class(Function, {
   bind : function(obj, args){
        var method = this;
        return function() {
            var applyArgs = args || arguments;
            return method.apply(obj || window, applyArgs);
        };
    }
});

var EffectAbstract = Class({
    init: function(obj, config){
        this.time = 1000;
        Object.extend(this, config || {});
        
        this.interval = null;        
        if (obj) {
            this.obj = obj;
            if (typeof this.obj == 'string') {
                this.obj = document.getElementById(this.obj);
            }
            this.obj.style.position = 'absolute';
        }            
    },
    start: function(){
        this.prepare();
       
        this.timeStart  = new Date().getTime();
        this.timeFinish = this.timeStart+this.time;
        this.interval   = setInterval(this.iteration.bind(this), 15);
    },
    iteration: function(){
        var timeCurr = new Date().getTime();
        if (timeCurr <= this.timeFinish) {
            this.update( (this.timeStart-timeCurr)/(this.timeStart-this.timeFinish) );
        } else {
            this.cancel();
            this.callBack();
        }
       
    },
    cancel: function(){
        if (this.interval) {
            this.update( 1 );
            clearInterval(this.interval);
        }
    },
    prepare: function(){},
    update: function(pos){},
    callBack: function(){}
});
        
var EffectGrow = Class(EffectAbstract, {
    prepare: function(){
    
        this.oriWidth  = parseInt(this.obj.style.width);
        this.oriHeight = parseInt(this.obj.style.height);
        this.oriLeft   = this.obj.offsetLeft;
        this.oriTop    = this.obj.offsetTop;
        
        this.oriImgWidth  = {};
        this.oriImgHeight = {};
        
        this.childs = this.obj.children;
        for (var i=0; i<this.childs.length; i++) {
            this.oriImgWidth[i]  = this.childs[i].offsetWidth;
            this.oriImgHeight[i] = this.childs[i].offsetHeight;    
        }
        
        this.obj.style.width = '0px';
        this.obj.style.height = '0px';
        
    },
    update: function(pos) {
        
        this.obj.style.width  = (this.oriWidth * pos)+'px';
        this.obj.style.height = (this.oriHeight * pos)+'px';
        this.obj.style.top    = this.oriTop+((this.oriHeight-(this.oriHeight * pos))/2)+'px';
        this.obj.style.left   = this.oriLeft+((this.oriWidth-(this.oriWidth * pos))/2)+'px';
        this.obj.style.fontSize = (100 * pos)+'%';
        for (var i=0; i<this.childs.length; i++) {
            this.childs[i].style.width  = (this.oriImgWidth[i] * pos)+'px';
            this.childs[i].style.height = (this.oriImgHeight[i] * pos)+'px';
        }
    }
});

var EffectApear = Class(EffectAbstract, {
    prepare: function(){    
        this.setOpacity(0);
    },
    setOpacity: function(value) {        
        this.obj.style.opacity = value/10;
        this.obj.style.filter = 'alpha(opacity=' + value*10 + ')';
    },
    update: function(pos) {
        this.setOpacity( pos*10 );
    }
});

var EffectParallel = Class(EffectAbstract, {
    init: function(effects, config){
        this.constructor(null, config);
        this.effects = effects;
    },
    prepare: function() {
        this.effects.forEach(function(effect){
            effect.prepare();            
        }, this);
    },
    update: function(pos) {
        this.effects.forEach(function(effect){
            effect.update(pos);            
        }, this);
    }
});

var Ajax = Class({
    
    init: function(config){
        this.config = config || {};
        
        this.transport = this.getTransport();
        this.request();
    },
    
    getTime: function(){
        return new Date().getTime();
    },
    
    getTransport: function(){
        var tranport = null;
        try {
            tranport = new XMLHttpRequest();
        } catch(e) {
            try {
                tranport = new ActiveXObject("Msxml2.XMLHTTP");
            } catch(e) {
                try {
                    tranport = new ActiveXObject("Microsoft.XMLHTTP");                    
                } catch(e) {
                    alert("Esse browser não tem recursos para uso do Ajax");
                }
            }    
        }
        return tranport;
    },
    
    request: function(){
        try {
            this.transport.open('GET', this.config.url+'?tm='+this.getTime(), true);
            this.transport.onreadystatechange = this.onReadyStateChange.bind(this);
            this.transport.send(null);
        } catch(e) {
            alert('Erro no ajax: '+e.message);
        }
                    
    },
    
    onReadyStateChange: function(){
        if(this.transport.readyState == 4) {
            if (this.transport.status == 200) {
                if (this.config.success && typeof this.config.success == 'function') {
                    this.config.success(this.transport);
                }
            } else {
                if (this.config.failure && typeof this.config.success == 'function') {
                    this.config.failure(this.transport);
                }
            }
        }
    }
    
});

var TwiterProxy = Class({

    url: 'twitter.php',
    
    init: function(config) {
        
        this.proxy();        
        this.config = config || {};
    },
    
    proxy: function() {
        
        this.proxy = new Ajax({
            url: this.url,
            success: this.success.bind(this),
            failure: this.failure.bind(this)
        });
    },
    
    success: function(transport){
        
        if (transport.responseText == '') {
            this.failure(transport);
            return;
        }
        
        var request = JSON.parse(transport.responseText);
        
        if (request.results.length > 0) {
            if (this.config.success && typeof this.config.success == 'function') {
                this.config.success(request.results[0], transport);
            }
        }        
    },
    
    failure: function(transport){
        
        if (this.config.failure && typeof this.config.failure == 'function') {
            this.config.failure(transport);
        }
    }

});

var PageSize = {
    getWidth: function() {
        return document.body.clientWidth || document.documentElement.clientWidth;
    },
    getHeight: function() {
        return document.body.clientHeight || document.documentElement.clientHeight;
    }
}

var TwitterGrow = Class({
    
    init: function() {
        
        this.makeContainer();
        
        this.requestMessage();
        
    }, 
    
    requestMessage: function() {
        
        new TwiterProxy({
            success: function(result){
                
                this.updateContainer( result.profile_image_url,
                                      result.from_user,
                                      result.text );
                
                this.grow();
            }.bind(this),
            
            failure: function(){
                this.requestMessage();
            }.bind(this)
        });
        
    },
    
    makeContainer: function(){
        
        this.container = document.createElement('div');
        this.container.className = 'container';
        this.container.style.width  = '450px';
        this.container.style.height = '70px';
                
        this.picture = document.createElement('img');
        this.picture.className = 'picture';
            
        this.head = document.createElement('div');
        this.head.className = 'head';
            
        this.body = document.createElement('div');
        this.body.className = 'body';
            
        this.container.appendChild(this.picture);
        this.container.appendChild(this.head);
        this.container.appendChild(this.body);

        document.getElementsByTagName('body')[0].appendChild( this.container );
        
    },
    
    updateContainer: function(picture, name, text){
        
        this.picture.setAttribute('src', picture);
        this.head.innerHTML = name;
        this.body.innerHTML = text;
        
    },
    
    grow: function() {
        if (this.effect) {
            this.effect.cancel();
        }

        var 
        widthPage  = PageSize.getWidth()  - this.container.offsetWidth,
        heightPage = PageSize.getHeight() - this.container.offsetHeight;

        this.container.style.left = Math.floor(Math.random()*widthPage)+'px';
        this.container.style.top  = Math.floor(Math.random()*heightPage)+'px';        
        
        this.effect = new EffectParallel([new EffectGrow(this.container), new EffectApear(this.container)], {
            time: 2000,
            callBack: this.requestMessage.bind(this)
        });
        this.effect.start();
    }
    
});

new TwitterGrow();