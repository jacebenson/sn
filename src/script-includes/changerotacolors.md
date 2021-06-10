---
title: "ChangeRotaColors"
id: "changerotacolors"
---

API Name: global.ChangeRotaColors

```js
var ChangeRotaColors = Class.create();
ChangeRotaColors.prototype = {
	initialize: function() {
		this.colorsByContrast = {};
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
	},
	
	populateRotaColor: function(){
		var groupRotas = this._getGroupRotas();
		for (var key in groupRotas){
			var rotas = groupRotas[key];
			this._updateRotaColor(rotas);
		}
	},
	
	setNextRotaColor: function(rotaGr){
		var groupSysId = rotaGr.group;
		var ga = new GlideAggregate('cmn_rota');
		ga.addQuery('group', groupSysId);
		ga.addAggregate('count');
		ga.query();
		
		var noOfRotas = 0;
		if (ga.next())
			noOfRotas = ga.getAggregate('count');
		this.log.debug("[setNextRotaColor] noOfRotas: " + noOfRotas);
		
		var color = this._getColor(noOfRotas);
		this.log.debug("[setNextRotaColor] color: " + color);
		rotaGr.background_color = color;
	},
	
	getContrast: function(hexColor) {
		if (!JSUtil.nil(hexColor))
			hexColor = hexColor.replace("#", "");
	
		if (!JSUtil.nil(hexColor) && this._isHex(hexColor))
			hexColor = GlideAJAXSchedulePage.shortHexToLong(hexColor);

		var contrastColor = this.colorsByContrast[hexColor];
		
		if (contrastColor)
			return contrastColor;
		
		var algorithm = gs.getProperty("com.snc.on_call_rotation.contrast", "ContrastYIQ");
		switch (algorithm) {
			case "ContrastPercent":
				contrastColor = this.getContrastPercent(hexColor);
				break;
			case "ContrastLuminance":
				contrastColor = this.getContrastLuminance(hexColor);
				break;
			default:
				contrastColor = this.getContrastYIQ(hexColor);
		}
		
		this.colorsByContrast[hexColor] = contrastColor;
		return contrastColor;
	},
	
	getContrastPercent: function(hexcolor) {
		hexcolor = this._colorToHex(hexcolor);
		var contrast = this._getContrast(parseInt(hexcolor, 16) > 0xffffff / 2);
		this.log.debug("[getContrastPercent] contrast: " + contrast);
		return contrast;
	},
	
	getContrastYIQ: function(hexcolor) {
		var rgb = this._getRGB(hexcolor);
		var yiq = ((rgb.red * 299) + (rgb.green * 587) + (rgb.blue * 114)) / 1000;
		var contrast = this._getContrast(yiq >= 128);
		this.log.debug("[getContrastYIQ] contrast: " + contrast);
		return contrast;
	},
	
	getContrastLuminance: function(hexcolor) {
		var rgb = this._getRGB(hexcolor);
		var luminance = ((rgb.red * 0.2126) + (rgb.green * 0.7152) + (rgb.blue * 0.0722));
		var contrast = this._getContrast(luminance >= 110);
		this.log.debug("[getContrastLuminance] contrast: " + contrast);
		return contrast;
	},
	
	_getContrast: function(dark) {
		return dark ? "#" + this._colorToHex("black") : "#" + this._colorToHex("white");
	},
	
	_getRGB: function(hexcolor) {
		var rgb = {"red" : 0, "green" : 0, "blue" : 0};
		if (JSUtil.nil(hexcolor))
			return rgb;
		
		// change colors e.g. white, blue etc to hex
		hexcolor = this._colorToHex(hexcolor);
		this.log.debug("[_getRGB] hexcolor: " + hexcolor);
		
		rgb.red = parseInt(hexcolor.substr(0, 2), 16);
		rgb.green = parseInt(hexcolor.substr(2, 2), 16);
		rgb.blue = parseInt(hexcolor.substr(4, 2), 16);
		this.log.debug("[_getRGB] red: " + rgb.red + " green: " + rgb.green + " blue: " + rgb.blue);
		return rgb;
	},
	
	_isHex: function(hex) {
		hex = "" + hex;
		if (JSUtil.nil(hex))
			return false;
		
		for (var i = 0; i < hex.length; i++) {
			var c = hex[i];
			if (('0' <= c && c <= '9') || ('a' <= c && c <= 'f') || ('A' <= c && c <= 'F'))
				continue;
			
			return false;
		}
		return true;
	},
	
	_colorToHex: function(color) {
		// remove hash prefix
		color = color.replace("#", "");
		if (this._isHex(color))
			return color;
		return GlideAJAXSchedulePage.colorToHex(color).replace("#", "");
	},
	
	_getGroupRotas: function() {
		var gr = new GlideRecord('cmn_rota');
		gr.orderBy('sys_created');
		gr.query();
		var groups = {};
		while(gr.next()) {
			if (groups[gr.group])
				groups[gr.group].push(gr.sys_id + "");
			else
				groups[gr.group] = [gr.sys_id + ""];
		}
		this.log.debug("[_getGroupRotas] groups: " + JSON.stringify(groups));
		return groups;
	},
	
	_getColor: function(index){
		var calUtil = new OCCalendarUtils();
		var totalRecoColor = calUtil.PALLETE_COLORS.length;
		var pickColorIndex = (index * totalRecoColor + index) % totalRecoColor;
		if (index < calUtil.PALLETE_COLORS.length)
			return calUtil.PALLETE_COLORS[pickColorIndex];
		else
			return GlideAJAXSchedulePage.colorValue(index);
	},
	
	_updateRotaColor: function(rotas){
		var gr = new GlideRecord('cmn_rota');
		for (var i = 0; i < rotas.length; i++){
			gr.initialize();
			gr.setWorkflow(false);
			gr.get(rotas[i]);
			var color = this._getColor(i);
			gr.setValue('background_color', color);
			gr.update();
			this.log.info("[_updateRotaColor] Group: " + gr.group.name + " Rota: " + gr.name + " Color: " + color);
		}
	},
	
	type: 'ChangeRotaColors'
};
```