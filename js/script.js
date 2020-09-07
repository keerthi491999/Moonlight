var RENDERER = {
	SHIP_INTERVAL_RANGE : {min : 300, max : 600},
	SHOOTING_STAR_INTERVAL_RANGE : {min : 200, max : 400},
	SHIP_OFFSET : 5,
	STAR_COUNT : 100,
	DELTA_THETA : Math.PI / 300,
	
	init : function(){
		this.setParameters();
		this.prepare();
		this.reconstructMethod();
		this.render();
	},
	setParameters : function(){
		this.$container = $('#jsi-moonlight-container');
		this.width = this.$container.width();
		this.height = this.$container.height();
		this.canvasShootingStar = $('<canvas />').attr({width : this.width, height : this.height / 2}).appendTo(this.$container).get(0);
		this.contextShootingStar = this.canvasShootingStar.getContext('2d');
		this.canvasStar = $('<canvas />').attr({width : this.width, height : this.height / 2}).appendTo(this.$container).get(0);
		this.contextStar = this.canvasStar.getContext('2d');
		this.canvas = $('<canvas />').attr({width : this.width, height : this.height}).appendTo(this.$container).get(0);
		this.context = this.canvas.getContext('2d');
		
		this.ships = [];
		this.stars = [];
		this.shootingStars = [];
		this.sourceIndices = [];
		this.coefficients = [];
		this.shipInterval = this.getRandomValue(this.SHIP_INTERVAL_RANGE) | 0;
		this.shootingStarInterval = this.getRandomValue(this.SHOOTING_STAR_INTERVAL_RANGE) | 0;
		this.theta = 0;
		this.displacementOffset = 0;
	},
	prepare : function(){
		var width = this.width,
			height = Math.ceil(this.height / 2);
			
		for(var y = 0; y < height; y++){
			for(var x = 0; x < width; x++){
				this.sourceIndices.push(((height - y - 1) * width + x) * 4);
				this.coefficients.push(Math.pow(height, 10) / Math.pow(height - y, 10));
			}
		}
		for(var i = 0, length = this.STAR_COUNT; i < length; i++){
			this.stars.push(new STAR(this.width, this.height / 2, this.contextStar, this));
		}
		this.moon = MOON.init(this.width, this.height, this.context);
		this.ships.push(new SHIP(this.width, this.height, this.context, this));
		this.hue += this.HUE_OFFSET;
		this.shootingStars.push(new SHOOTING_STAR(this.width, this.height / 2, this.contextShootingStar, this));
	},
	getRandomValue : function(range){
		return range.min + (range.max - range.min) * Math.random();
	},
	reconstructMethod : function(){
		this.render = this.render.bind(this);
	},
	render : function(){
		this.context.clearRect(0, 0, this.width, this.height);
		this.contextStar.clearRect(0, 0, this.width, this.height / 2);
		this.contextShootingStar.fillStyle = 'rgba(0, 0, 0, 0.1)';
		this.contextShootingStar.fillRect(0, 0, this.width, this.height / 2);
		
		for(var i = 0, length = this.stars.length; i < length; i++){
			this.stars[i].render(this.contextStar);
		}
		for(var i = this.shootingStars.length - 1; i >= 0; i--){
			if(!this.shootingStars[i].render(this.contextShootingStar)){
				this.shootingStars.splice(i, 1);
				this.contextShootingStar.clearRect(0, 0, this.width, this.height / 2);
			}
		}
		if(--this.shootingStarInterval == 0){
			this.shootingStarInterval = this.getRandomValue(this.SHOOTING_STAR_INTERVAL_RANGE) | 0;
			this.shootingStars.push(new SHOOTING_STAR(this.width, this.height / 2, this.contextShootingStar, this));
		}
		this.moon.render(this.context);
		
		for(var i = this.ships.length - 1; i >= 0; i--){
			this.ships[i].render(this.context, false);
		}
		var width = this.width,
			height = Math.ceil(this.height / 2),
			data = this.context.getImageData(0, 0, width, height).data,
			frame = this.context.createImageData(width, height),
			frameData = frame.data,
			index = 0,
			minShipY = height - 40,
			minMoonX = width / 2 - 80,
			maxMoonX = width / 2 + 80,
			minMoonY = this.height / 5 - 80,
			maxMoonY = this.height / 5 + 80,
			maxIndex = width * height * 4;
			
		for(var y = 0; y < height; y++){
			for(var x = 0; x < width; x++){
				if(y < minShipY && (x < minMoonX || x > maxMoonX || y < minMoonY || y > maxMoonY)){
					index++;
					continue;
				}
				var displacement = (4 * Math.sin(this.coefficients[index] + this.displacementOffset)) | 0,
					destinationIndex = ((displacement + y) * width + displacement + this.SHIP_OFFSET + x) * 4,
					sourceIndex = this.sourceIndices[++index];
					
				if(destinationIndex < 0 || destinationIndex >= maxIndex){
					continue;
				}
				frameData[sourceIndex] = data[destinationIndex];
				frameData[++sourceIndex] = data[++destinationIndex];
				frameData[++sourceIndex] = data[++destinationIndex];
				frameData[++sourceIndex] = (x + displacement + this.SHIP_OFFSET >= width) ? 0 : data[++destinationIndex];
			}
		}
		for(var i = this.ships.length - 1; i >= 0; i--){
			if(!this.ships[i].render(this.context, true)){
				this.ships.splice(i, 1);
			}
		}
		if(--this.shipInterval == 0){
			this.shipInterval = this.getRandomValue(this.SHIP_INTERVAL_RANGE) | 0;
			this.ships.push(new SHIP(this.width, this.height, this.context, this));
		}
		this.context.save();
		this.context.globalCompositeOperation = 'overlay';
		this.context.putImageData(frame, 0, height);
		
		var gradient = this.context.createLinearGradient(0, height, 0, this.height);
		gradient.addColorStop(0, 'hsl(230, 80%, 10%)');
		gradient.addColorStop(1, 'hsl(210, 80%, ' + (45 + 15 * Math.sin(this.theta) | 0) + '%)');
		
		this.context.fillStyle = gradient;
		this.context.fillRect(0, this.height / 2, this.width, this.height / 2);
		this.context.restore();
		
		if(this.displacementOffset > 6){
			this.displacementOffset = 0;
		}else{
			this.displacementOffset += 0.1;
		}
		this.theta += this.DELTA_THETA;
		this.theta %= Math.PI * 2;
		requestAnimationFrame(this.render);
	}
};
var SHIP = function(width, height, context, renderer){
	this.width = width;
	this.height = height;
	this.renderer = renderer;
	this.init(context);
};
SHIP.prototype = {
	VELOCITY_RANGE : {min : 0.4, max : 0.6},
	COLOR : 'hsl(%hue, 80%, %luminance%)',
	BODY_COLOR : '#303030',
	LIGHT_COLOR :'hsl(60, 60%, 90%)',
	OFFSET : 35,
	DELTA_THETA : Math.PI / 100,
	SHAKE_ANGLE : Math.PI / 60,
	DELTA_PHI : Math.PI / 100,
	DELTA_HUE : 0.2,
	
	init : function(context){
		this.direction = Math.random() < 0.5;
		this.x = this.direction ? -this.OFFSET : (this.width + this.OFFSET);
		this.y = this.height / 2;
		this.vx = this.renderer.getRandomValue(this.VELOCITY_RANGE) * (this.direction ? 1 : -1);
		this.theta = Math.PI * 2 * Math.random();
		this.hue = 360 * Math.random() | 0;
		
		this.gradient = context.createLinearGradient(0, -20, 0, 0);
		this.gradient.addColorStop(0, '#404040');
		this.gradient.addColorStop(1, '#101010');
	},
	render : function(context, isLatterHalf){
		context.save();
		context.translate(this.x, this.y);
		context.scale((this.direction ? -1 : 1), 1);
		context.rotate(Math.sin(this.theta) * this.SHAKE_ANGLE);
		
		if(isLatterHalf){
			context.beginPath();
			context.fillStyle = this.gradient;
			context.moveTo(-35, -10);
			context.lineTo(35, -10);
			context.quadraticCurveTo(35, -5, 25, 0);
			context.lineTo(20, 0);
			context.lineTo(-20, 0);
			context.lineTo(-35, -10);
			
			context.moveTo(-15, -20);
			context.lineTo(22, -20);
			context.lineTo(22, -10);
			context.lineTo(-15, -10);
			context.lineTo(-15, -20);
			context.fill();
		}
		for(var i = 0; i < 7; i++){
			var color = this.COLOR.replace('%hue', this.hue);
				gradient = context.createRadialGradient(0, 0, 0, 0, 0, 3);
				
			gradient.addColorStop(0, color.replace('%luminance', 80));
			gradient.addColorStop(0.3, color.replace('%luminance', 60));
			gradient.addColorStop(1, color.replace('%luminance', 30));
			
			context.save();
			context.shadowBlur = 10;
			context.shadowColor = this.COLOR.replace('%hue', this.hue).replace('%luminance', 80);
			context.fillStyle = gradient;
			context.translate(-22 + 8 * i, -20 - (i < 4 ? 4 * i : (9 - (i - 4) * 4)));
			context.beginPath();
			context.arc(0, 0, 3, 0, Math.PI * 2, false);
			context.fill();
			context.restore();
		}
		context.save();
		context.shadowBlur = 10;
		context.shadowColor = this.LIGHT_COLOR;
		context.fillStyle = this.LIGHT_COLOR;
		
		for(var i = 0; i < 5; i++){
			context.save();
			context.translate(-10 + i * 7, -15);
			context.beginPath();
			context.fillRect(-2, -2, 4, 4);
			context.restore();
		}
		context.restore();
		context.restore();
		
		if(isLatterHalf){
			this.x += this.vx;
			this.theta += this.DELTA_THETA;
			this.theta %= Math.PI * 2;
			this.hue += this.DELTA_HUE;
			this.hue %= 360;
		}
		return this.x >= -this.OFFSET && this.x <= this.width + this.OFFSET;
	}
};
var MOON = {
	RADIUS : 50,
	
	init : function(width, height, context){
		this.width = width;
		this.height = height;
		this.x = this.width / 2;
		this.y = this.height / 5;
		
		this.gradient = context.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.RADIUS);
		this.gradient.addColorStop(0, 'hsl(60, 60%, 60%)');
		this.gradient.addColorStop(0.8, 'hsl(60, 60%, 90%)');
		this.gradient.addColorStop(1, 'hsl(60, 60%, 90%)');
		return this;
	},
	render : function(context){
		context.save();
		context.beginPath();
		context.shadowColor = 'hsl(60, 90%, 100%)';
		context.shadowBlur = 25;
		context.fillStyle = this.gradient;
		context.arc(this.x, this.y, this.RADIUS, 0, Math.PI * 2, false);
		context.closePath();
		context.fill();
		context.restore();
	}
};
var STAR = function(width, height, context, renderer){
	this.width = width;
	this.height = height;
	this.renderer = renderer;
	this.init(context);
};
STAR.prototype = {
	RADIUS_RANGE : {min : 1, max : 4},
	COUNT_RANGE : {min : 100, max : 1000},
	DELTA_THETA : Math.PI / 30,
	
	init : function(context){
		this.radius = this.renderer.getRandomValue(this.RADIUS_RANGE);
		this.x = this.renderer.getRandomValue({min : 0, max : this.width});
		this.y = this.renderer.getRandomValue({min : 0, max : this.height});
		this.maxCount = this.renderer.getRandomValue(this.COUNT_RANGE) | 0;
		this.count = this.maxCount;
		this.theta = 0;
		
		this.gradient = context.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
		this.gradient.addColorStop(0, 'hsla(220, 80%, 100%, 1)');
		this.gradient.addColorStop(0.1, 'hsla(220, 80%, 80%, 1)');
		this.gradient.addColorStop(0.25, 'hsla(220, 80%, 50%, 1)');
		this.gradient.addColorStop(1, 'hsla(220, 80%, 30%, 0)');
	},
	render : function(context){
		context.save();
		context.globalAlpha = Math.abs(Math.cos(this.theta));
		context.beginPath();
		context.fillStyle = this.gradient;
		context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
		context.fill();
		context.restore();
		
		if(--this.count == 0){
			this.theta = Math.PI;
			this.count = this.maxCount;
		}
		if(this.theta > 0){
			this.theta -= this.DELTA_THETA;
		}
	}
};
var SHOOTING_STAR = function(width, height, context, renderer){
	this.width = width;
	this.height = height;
	this.renderer = renderer;
	this.init(context);
};
SHOOTING_STAR.prototype = {
	RADIUS : 5,
	VELOCITY : 3,
	ANGLE_RANGE : {min : Math.PI * 3 / 16, max : Math.PI * 5 / 16},
	RATE : 0.6,
	
	init : function(context){
		var angle = this.renderer.getRandomValue(this.ANGLE_RANGE);
		this.x = this.renderer.getRandomValue({min : 0, max : this.width});
		this.y = -this.RADIUS;
		this.vx = this.VELOCITY * Math.cos(angle) * ((this.x < this.width / 2) ? 1 : -1);
		this.vy = this.VELOCITY * Math.sin(angle);
		this.threshold = this.height * this.RATE;
		
		this.gradient = context.createRadialGradient(0, 0, 0, 0, 0, this.RADIUS);
		this.gradient.addColorStop(0, 'hsla(220, 80%, 100%, 1)');
		this.gradient.addColorStop(0.1, 'hsla(220, 80%, 80%, 1)');
		this.gradient.addColorStop(0.25, 'hsla(220, 80%, 50%, 1)');
		this.gradient.addColorStop(1, 'hsla(220, 80%, 30%, 0)');
	},
	render : function(context){
		context.save();
		
		if(this.y > this.threshold){
			context.globalAlpha = Math.max(0, (this.height - this.y) / this.threshold);
		}
		context.translate(this.x, this.y);
		context.beginPath();
		context.fillStyle = this.gradient;
		context.arc(0, 0, this.RADIUS, 0, Math.PI * 2, false);
		context.fill();
		context.restore();
		
		this.x += this.vx;
		this.y += this.vy;
		return this.y <= this.height + this.RADIUS;
	}
};
$(function(){
	RENDERER.init();
});