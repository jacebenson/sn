---
title: "GuidedTourDesignerHelper"
id: "guidedtourdesignerhelper"
---

API Name: global.GuidedTourDesignerHelper

```js
var GuidedTourDesignerHelper = Class.create();
GuidedTourDesignerHelper.prototype = {
    initialize: function() {
    },
	
	getCurrentDomain : function(){
		var currentDomain ;
		
		if(gs.getUser().getDomainDisplayValue() == 'global')
			currentDomain = 'global';
		else
			currentDomain = gs.getUser().getDomainID();
		
		return currentDomain;
	},
	
	getUserUI16Preference : function(){
		return gs.getPreference('use.concourse');
	},
	
	getSanitizedHTML : function(text){
		if (!SNC.GlideHTMLSanitizer)
			return JSUtil.escapeText(text);
		
		return SNC.GlideHTMLSanitizer.sanitizeWithConfig("HTMLSanitizerConfig",text); 
		
	},
	/*
	  Helper function to evalute ACL for tour creation
	*/
	canUserCreateTours: function() {
		var standard_ui = 
			gs.getProperty('com.snc.guided_tours.standard_ui.enable', 'false') === 'true';
		var sp = gs.getProperty('com.snc.guided_tours.sp.enable', 'false') === 'true';
        var ga = gs.getUser().hasRole('guided_tour_admin');
        return (standard_ui || sp) && ga;
	}, 
	/*
	  Helper function to evalute ACL for tour edit and delete
	*/
    canUserUpdateTours: function(type) {
	    var standard_ui = 
			gs.getProperty('com.snc.guided_tours.standard_ui.enable', 'false')   ==='true';
		var sp = gs.getProperty('com.snc.guided_tours.sp.enable', 'false') === 'true';
		var ga = gs.getUser().hasRole('guided_tour_admin');
		var answer = false;

		if(type == 'platform' && standard_ui) {
			answer = true;
		}else if(type == '' && standard_ui) {
			answer = true;
		}else if(type == 'service_portal' && sp) {
			answer = true;
		}
		return answer && ga;
	},

    type: 'GuidedTourDesignerHelper'
};
```