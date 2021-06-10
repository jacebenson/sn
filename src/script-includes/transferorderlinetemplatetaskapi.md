---
title: "TransferOrderLineTemplateTaskAPI"
id: "transferorderlinetemplatetaskapi"
---

API Name: global.TransferOrderLineTemplateTaskAPI

```js
var TransferOrderLineTemplateTaskAPI = Class.create();
TransferOrderLineTemplateTaskAPI.prototype = {
	initialize : function() {
		this.domainId = TransferOrderLineTemplateTaskAPI.getCurrentDomainSysId();
	},
	
	copyDefaultTemplateTasks : function(modelCategory){
		var defaultTemplateGr = new GlideRecord('alm_template_task');
		defaultTemplateGr.addQuery('model_category', TransferOrderLineTemplateTaskAPI.DEFAULT_MODEL_CATEGORY);
		defaultTemplateGr.query();
		while(defaultTemplateGr.next()){
			// Check if stage and model_category combination exists already in the table
			var customTemplateGr = new GlideRecord('alm_custom_template_task');
			customTemplateGr.addQuery('model_category', modelCategory);
			customTemplateGr.addQuery('stage', defaultTemplateGr.stage);
			customTemplateGr.addQuery('sys_domain', this.domainId);
			customTemplateGr.query();
			// If not, then
			if(!customTemplateGr.hasNext()){
				// Copy template tasks
				customTemplateGr.initialize();
				customTemplateGr.task_name = defaultTemplateGr.task_name;
				customTemplateGr.short_description = defaultTemplateGr.short_description;
				customTemplateGr.model_category = modelCategory;
				customTemplateGr.stage = defaultTemplateGr.stage;
				customTemplateGr.order = defaultTemplateGr.order;
				customTemplateGr.sys_class_name = customTemplateGr.getRecordClassName();
				customTemplateGr.insert();
			}
		}
		var urlOnStack = GlideSession.get().getStack().bottom();
		response.sendRedirect(urlOnStack);
	},
	
	findAndCreateTask: function(modelCategorySysId, stage) {
        var transferOrderLine = current.sys_id;
        var modelCategoryGR = this.findModelCategory(modelCategorySysId, stage);
		
		// Create task for the found model category
        if (!gs.nil(modelCategoryGR.getUniqueValue()))
            this.createTask(modelCategoryGR, transferOrderLine);
    },

    findModelCategory: function(modelCategorySysId, stage) {
		var modelCategoryCustomTemplateTaskGr;
		
		// Check if the model category has corresponding template tasks defined in the custom and default template task table
		modelCategoryCustomTemplateTaskGr = this.findTasksForAModelCategory(modelCategorySysId, 'alm_custom_template_task', stage, this.domainId);

		// If there are tasks, then
		if (modelCategoryCustomTemplateTaskGr.next()) {
			return modelCategoryCustomTemplateTaskGr;
		}

		var modelCategoryTemplateTaskGr = this.findTasksForAModelCategory(modelCategorySysId, 'alm_template_task', stage);
			if (modelCategoryTemplateTaskGr.next()) {
				return modelCategoryTemplateTaskGr;
			} else {
				// If not, then create a task from default template based on the order of the task
				var modelCategoryDefaultTemplateTaskGr = this.findTasksForAModelCategory(TransferOrderLineTemplateTaskAPI.DEFAULT_MODEL_CATEGORY, 'alm_template_task', stage);
				if (modelCategoryDefaultTemplateTaskGr.next()) {
					return modelCategoryDefaultTemplateTaskGr;
				}
			}
		},

    findTasksForAModelCategory: function(modelCategorySysId, table, stage, domainId) {		
		var modelCategoryTemplateTaskGr = new GlideRecord(table);
		modelCategoryTemplateTaskGr.addQuery('model_category', modelCategorySysId);
		modelCategoryTemplateTaskGr.addQuery('stage', stage);
		if(!gs.nil(domainId)) {
			modelCategoryTemplateTaskGr.addQuery('sys_domain', domainId);
		}
		modelCategoryTemplateTaskGr.orderBy('sys_domain_path');
		modelCategoryTemplateTaskGr.setLimit(1);
		modelCategoryTemplateTaskGr.query();
		return modelCategoryTemplateTaskGr;
	},

    createTask: function(modelCategoryTemplateTaskGr, transferOrderLine) {
		// Check if a task already exists for a selected model category, stage and TOL
		var tolTemplateTaskGr = new GlideRecord('alm_transfer_order_line_task');
		tolTemplateTaskGr.addQuery('stage', modelCategoryTemplateTaskGr.stage);
		tolTemplateTaskGr.addQuery('model_category', modelCategoryTemplateTaskGr.model_category);
		tolTemplateTaskGr.addQuery('transfer_order_line', transferOrderLine);
		tolTemplateTaskGr.query();
		if (!tolTemplateTaskGr.hasNext()) {
			// Create task
			tolTemplateTaskGr.initialize();
			tolTemplateTaskGr.short_description = modelCategoryTemplateTaskGr.task_name;
			tolTemplateTaskGr.order = modelCategoryTemplateTaskGr.order;
			tolTemplateTaskGr.stage = modelCategoryTemplateTaskGr.stage;
			tolTemplateTaskGr.model_category = modelCategoryTemplateTaskGr.model_category;
			tolTemplateTaskGr.transfer_order_line = transferOrderLine;
			tolTemplateTaskGr.template_task = modelCategoryTemplateTaskGr.sys_id;
			var tolTaskSysId = tolTemplateTaskGr.insert();
			return tolTaskSysId;
		}
		return null;
	},
	
	pushStageOfTOAndTOLFromTOL: function(transferOrderLineTask) {
		var transferOrderLineTaskStage = transferOrderLineTask.getValue('stage');
		if(transferOrderLineTaskStage === 'received'){
			this.receiveTOL(transferOrderLineTask);
		}
		if (transferOrderLineTaskStage !== 'received' && transferOrderLineTaskStage === 'delivered') {
			transferOrderLineTask.quantity_received = transferOrderLineTask.quantity_requested;
			transferOrderLineTask.quantity_remaining = 0;
		}
		
		//Update TOL with new stage
		var tolGr = new GlideRecord('alm_transfer_order_line');
		tolGr.get(transferOrderLineTask.transfer_order_line.sys_id);
		if (transferOrderLineTaskStage === 'requested'){
			tolGr.quantity_remaining = tolGr.quantity_requested;
		}
		tolGr.stage = transferOrderLineTaskStage;
		tolGr.update();
		
		// Propagate stage change to TO
		var transferOrderStageHandler = new TransferOrderStageHandler();
		transferOrderStageHandler.pushStageFromTOL(tolGr, transferOrderLineTaskStage);
		
		var urlOnStack = GlideSession.get().getStack().bottom();
		response.sendRedirect(urlOnStack);
	},

	
	receiveTOL: function (transferOrderLineTask){
		// Receive assets for same from and to stockroom
		if(transferOrderLineTask.transfer_order_line.transfer_order.from_stockroom.toString() === transferOrderLineTask.transfer_order_line.transfer_order.to_stockroom.toString()) {
			var fieldAgentTypeId = 'e2aa2b3f3763100044e0bfc8bcbe5dde';
			new TransferOrderReceiver().receiveAssets(transferOrderLineTask.transfer_order_line.sys_id, transferOrderLineTask.transfer_order_line.quantity_requested);
			if (transferOrderLineTask.transfer_order_line.transfer_order.from_stockroom.type == fieldAgentTypeId) {
				new TransferOrderReceiver().setItemDelivered(tol.sys_id);
			}
		}
		// This version of Receive works for receiving assets and 1 consumable
		else if(new TransferOrderStageHandler().isReceivingAllowed(transferOrderLineTask.transfer_order_line)){
			new TransferOrderReceiver().receiveAssets(transferOrderLineTask.transfer_order_line.sys_id, transferOrderLineTask.transfer_order_line.quantity_remaining);
		}
		// This version of Receive works for receiving consumables of multiple quantity
		else if(new TransferOrderStageHandler().isReceivingAllowedDialog(transferOrderLineTask.transfer_order_line)){
			var tor = new TransferOrderReceiver();
			tor.receiveAssets(transferOrderLineTask.transfer_order_line.sys_id, transferOrderLineTask.transfer_order_line.quantity_requested);
			response.sendRedirect("alm_transfer_order.do?sys_id=" + current.transfer_order_line.transfer_order);
		}
	},

	type: 'TransferOrderLineTemplateTaskAPI'
};

TransferOrderLineTemplateTaskAPI.DEFAULT_MODEL_CATEGORY = '9cd8f9b7b94b2300964fbb6da89f2ff3';

TransferOrderLineTemplateTaskAPI.getCurrentDomainSysId = function() {
		var currentDomainSysId = GlideSession.get().getCurrentDomainID();
		if (gs.nil(currentDomainSysId)) {
			return 'global';
		}
		return String(currentDomainSysId);
		};
```