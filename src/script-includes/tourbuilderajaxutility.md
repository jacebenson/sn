---
title: "TourBuilderAjaxUtility"
id: "tourbuilderajaxutility"
---

API Name: sn_tourbuilder.TourBuilderAjaxUtility

```js
var TourBuilderAjaxUtility = Class.create();

TourBuilderAjaxUtility.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
	_tbr : new TourBuilderRecorder(),
	_tbu : new TourBuilderUtility(),
	_tbd : new TourBuilderDetails(),
	_tbh : new global.GuidedTourDesignerHelper(),
	
	/*
	   Sanitizes HTML of Step content and retruns step object
	   @stepObj - step object
	*/
	sanitizeStepContent: function(stepObj) {
		if (stepObj && stepObj.guidedTourStep && stepObj.guidedTourStep.content)
             stepObj.guidedTourStep.content = this._tbh.getSanitizedHTML(stepObj.guidedTourStep.content);
		return stepObj;
	}, 
	
	saveStep: function(){
		
		var stepObj = this.sanitizeStepContent(new global.JSON().decode(this.getParameter('sysparm_step_json')));
		return this._tbr.saveStep(stepObj);
	},
	
	saveElement : function() {
		var elementObj = new global.JSON().decode(this.getParameter('sysparm_step_json'));
		var resultObj = this._tbr.saveElement(elementObj);
		return new global.JSON().encode(resultObj);
	},
	
	getSteps : function () {
		var args ={};
			var result = [];
			
			args.tour_id =  this.getParameter("sysparm_tour_id");
			result = this._tbd.getTourDetails(args);
			var toursteps =  new global.JSON().encode(result);
			return toursteps;
		},
		
		getActionSysid : function () {
			var elementObj = new global.JSON().decode(this.getParameter('sysparm_step_json'));
			var result = this._tbu.getActionSysid(elementObj);
			return result;
		},
		
		updateStepProperties : function(){
			
			var stepObj = this.sanitizeStepContent(new global.JSON().decode(this.getParameter('sysparm_step_json')));
			return this._tbr.updateStep(stepObj);;
		},
		
		deleteStep : function(){
			var tourId = this.getParameter('sysparm_tour_id');
			var stepId = this.getParameter('sysparm_step_id');
			this._tbr.deleteStep(tourId,stepId);
		},
		
		swapSteps : function() {
			
			var tourId = this.getParameter('sysparm_tour_id');
			var sourceStepNo = parseInt(this.getParameter('sysparm_source_step_no'));
			var destStepNo = parseInt(this.getParameter('sysparm_dest_step_no'));
			this._tbr.swapSteps(tourId,sourceStepNo,destStepNo);
		},
		
		canUserEditTour: function(){
			var tourId = this.getParameter('sysparm_tour_id');
			var resultObj = this._tbu.canUserEditTour(tourId);
			
			var result = this.newItem("result");
			result.setAttribute("status", resultObj.status);
			result.setAttribute("message", resultObj.message);
		},
	
		changeTourStatus: function(){
			var tourId = this.getParameter('sysparm_tour_id');
			var tourStatus = this.getParameter('sysparm_tour_status');
			var gr  = new GlideRecord('sys_embedded_tour_guide');
			gr.addQuery('sys_id',tourId);
			gr.query();
			if(gr.next()){
				if(tourStatus === 'draft'){
					gr.status = 'published';
				}else{
					gr.status = 'draft';
				}
				gr.update();
				return true;
			}
			return false;
		},
		
		type: 'TourBuilderAjaxUtility'
	});
```