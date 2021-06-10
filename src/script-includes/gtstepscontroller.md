---
title: "GTStepsController"
id: "gtstepscontroller"
---

API Name: sn_tourbuilder.GTStepsController

```js
var GTStepsController = Class.create();
GTStepsController.prototype = {
	_tbu : new sn_tourbuilder.TourBuilderUtility(),
	_tbr : new sn_tourbuilder.TourBuilderRecorder(),
	_tbh : new global.GuidedTourDesignerHelper(),
	_tbd : new sn_tourbuilder.TourBuilderDetails(),
	_df : new sn_tourbuilder.TourBuilderGenericDataFactory(),
	
	errorMessages: {
		invalidTourId : "Tour ID is invalid",
		incorrectTourId : "No tour with given sys_id present",
		elementDataRequired : "Element data is required",
		stepDataRequired : "Step data is required",
		incorrectStepId : "No step with given sys_id present for given tour",
		stepUpdateError : "Error in updating step",
		stepDeleteSuccess : "Step deleted successfully",
		stepDeleteError : "Error in deleting step",
		elementNotSavedRCA: "Restricted caller access error",
		elementNotSaved: "Error in saving step target"
	},
	
	status: {
		badRequest: "BAD_REQUEST",
		notFound : "NOT FOUND",
		success: "SUCCESS",
		internalError: "INTERNAL_ERROR",
		forbidden: "FORBIDDEN" 
	},
	
	initialize: function() {
    },
	
	/* Creates new step **
	** input: tour_id - sys_id of tour on which step is to be created
	** input: payload - object with step properties
	** returns: object with sys_id of created step
	*/
	createNewStep: function(tour_id, payload, cb){
		if(tour_id === 'null'){
			cb && cb(true, {status: this.status.badRequest, msg: this.errorMessages.invalidTourId});
			return;
		}
		
		if(!this._tbu.isValidTour(tour_id)){
			cb && cb(true, {status: this.status.notFound, msg: this.errorMessages.incorrectTourId});
			return;
		}
		
		if(typeof payload.guidedTourStep === 'undefined'){
			cb && cb(true, {status: this.status.badRequest, msg: this.errorMessages.stepDataRequired});
			return;
		}
		
		if(payload.step_type === 'step'){
			if(typeof payload.guidedToursElement === 'undefined'){
				cb && cb(true, {status: this.status.badRequest, msg: this.errorMessages.elementDataRequired});
				return;
			}
			
			var resultObj = this._tbr.saveElement(payload);
			
			// failed to save element 
			if(!resultObj.guidedTourSysId){
				var table = payload.guidedToursElement.table;
				
				if(table && this._tbu.isRestrictedCallerAccess(table)){
					cb && cb(true, {status: this.status.forbidden, msg: this.errorMessages.elementNotSavedRCA});
					return;
				} else {
					cb && cb(true, {status: this.status.internalError, msg: this.errorMessages.elementNotSaved});
					return; 
				} 
			}
			payload.guidedTourStep.target_ref = resultObj.guidedTourSysId;
			payload.guidedTourStep.action_target_ref = resultObj.guidedTourSysId;
		}
		
		payload.tourId = tour_id;
		
		//Sanitizes HTML of Step content
		if (payload && payload.guidedTourStep && payload.guidedTourStep.content)
             payload.guidedTourStep.content = this._tbh.getSanitizedHTML(payload.guidedTourStep.content);
		
		var stepSysId = this._tbr.saveStep(payload);
		cb && cb(null, {status: this.status.success, id: stepSysId});
		return;
	},
	
	/* Fetches all steps for given tour**
	** input: tour_id - sys_id of tour whose step details are to be fetched
	** returns: object details of all steps for given tour
	*/
	getTourStepsDetails: function(tour_id, cb){
		if(tour_id === 'null'){
			cb && cb(true, {status: this.status.badRequest, msg: this.errorMessages.invalidTourId});
			return;
		}
		
		if(!this._tbu.isValidTour(tour_id)){
			cb && cb(true, {status: this.status.notFound, msg: this.errorMessages.incorrectTourId});
			return;
		}
		
		var result = [];
		result = this._tbd.getTourDetails({tour_id : tour_id});
		
		cb && cb(null, {status: this.status.success, guidedTourStepsDetails: result});
		return;
	},
	
	/* Updates step **
	** input: tour_id - sys_id of tour whose step is to be updated
	** input: step_id - sys_id of step to be updated
	** returns: object with update success/failure status
	*/
	updateStep: function(tour_id, step_id, payload, cb){
		if(tour_id === 'null'){
			cb && cb(true, {status: this.status.badRequest, msg: this.errorMessages.invalidTourId});
			return;
		}
		
		if(!this._tbu.isValidTour(tour_id)){
			cb && cb(true, {status: this.status.notFound, msg: this.errorMessages.incorrectTourId});
			return;
		}
		
		if(!this.isValidStep(step_id, tour_id)){
			cb && cb(true, {status: this.status.notFound, msg: this.errorMessages.incorrectStepId});
			return;
		}
		
		if(typeof payload.guidedTourStep === 'undefined'){
			cb && cb(true, {status: this.status.badRequest, msg: this.errorMessages.stepDataRequired});
			return;
		}
		
		payload.tourId = tour_id;
		payload.stepSysId = step_id;
		
		//Sanitizes HTML of Step content
		if (payload && payload.guidedTourStep && payload.guidedTourStep.content)
             payload.guidedTourStep.content = this._tbh.getSanitizedHTML(payload.guidedTourStep.content);
		
		var stepUpdated = this._tbr.updateStep(payload);
		
		if(stepUpdated){
			cb && cb(null, {status: this.status.success, id: step_id});
			return;
		}
		
		cb && cb(true, {status: this.status.internalError, msg: this.errorMessages.stepUpdateError});
		return;
		
	},
	
	/* Deletes step **
	** input: tour_id - sys_id of tour whose step is to be deleted
	** input: step_id - sys_id of step to be deleted
	** returns: object with update success/failure status
	*/
	deleteStep: function(tour_id, step_id, cb){
		if(tour_id === 'null'){
			cb && cb(true, {status: this.status.badRequest, msg: this.errorMessages.invalidTourId});
			return;
		}
		
		if(!this._tbu.isValidTour(tour_id)){
			cb && cb(true, {status: this.status.notFound, msg: this.errorMessages.incorrectTourId});
			return;
		}
		
		if(!this.isValidStep(step_id, tour_id)){
			cb && cb(true, {status: this.status.notFound, msg: this.errorMessages.incorrectStepId});
			return;
		}
		
		var stepDeleted = this._tbr.deleteStep(tour_id,step_id);
		
		if(stepDeleted){
			cb && cb(null, {status: this.status.success, msg: this.errorMessages.stepDeleteSuccess});
			return;
		}
		
		cb && cb(true, {status: this.status.internalError, msg: this.errorMessages.stepDeleteError});
		return;
		
	},
	
	/* check if given step is valid **
	** input: step_id under consideration
	** input: tour_id of step under consideration 
	** returns: true/false
	*/	
	isValidStep : function(step_id, tour_id){
		var query_params = [];
		
		query_params.push({"column" : "sys_id", "value" : step_id });
		query_params.push({"column" : "guide", "value" : tour_id });	
		query_params.push({"column":"active","value":true});
		
		var stepSysId = this._df.getObjects({'table' :'sys_embedded_tour_step', 'query_params' : query_params});
		
		if(stepSysId !== "")
			return true;
		
		return false;
	},

    type: 'GTStepsController'
};
```