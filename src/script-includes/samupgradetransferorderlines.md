---
title: "SamUpgradeTransferOrderLines"
id: "samupgradetransferorderlines"
---

API Name: global.SamUpgradeTransferOrderLines

```js
var SamUpgradeTransferOrderLines = Class.create();
SamUpgradeTransferOrderLines.prototype = {
    initialize: function() {
		
    },

	createTasksForInflightTOLs: function() {
		var stageToTemplateTask = {};
		var stageCountMap = {
			'draft': 0,
			'requested': 1,
			'shipment_preparation': 2,
			'in_transit': 3,
			'received': 4,
			'delivered': 5,
			'cancelled': 6
		};
		var countStageMap = {
			0: 'draft',
			1: 'requested',
			2: 'shipment_preparation',
			3: 'in_transit',
			4: 'received',
			5: 'delivered',
			6: 'cancelled'
		};

		// Get all TOLs that are not cancelled
		var tolGr = new GlideRecord('alm_transfer_order_line');
		tolGr.addQuery('stage', 'NOT IN', ['cancelled']);
		tolGr.query();

		// Find the appropriate model category of the tol to create tasks
		// As we have introduced custom template tasks from NY, customer will be getting tasks only from default model category
		stageToTemplateTask = this.findTasksForAModelCategory(stageToTemplateTask);

		while (tolGr.next()) {
			/** tolGr - GlideRecord of alm_transfer_order_line table
				stageCount - Is the counter of all the stages (0 to 7)
				countStageMap - Key Value pair of stage and Value, to get stage from the count of the stage. For ex: countStageMap[2] return 'shipment_preparation'
				currentStageValue - Is the current value of the stage. For ex: if tol is in stage='shipment_preparation' then its value is 2 
			**/
			
			// Get TOLs current stage, to close tasks until this stage
			var currentStage = tolGr.getValue('stage');
			var currentStageValue = stageCountMap[currentStage];

			// Start creating tasks from 1 = 'requested' stage
			var stageCount = 1;

			// If 'to' and 'from' stockroom are same then skip creation of tasks until 'received' task
			if(!gs.nil(tolGr.getValue('transfer_order'))) {
				if (tolGr.transfer_order.from_stockroom.sys_id === tolGr.transfer_order.to_stockroom.sys_id) {
					stageCount = 4;
				}
			} else {
				if (tolGr.from_stockroom.sys_id === tolGr.to_stockroom.sys_id) {
					stageCount = 4;
				}
			}

			if(!gs.nil(currentStageValue)){
				while (stageCount < 6) {
					// Create tasks
					var newRecordSysId = this.createTask(stageToTemplateTask[countStageMap[stageCount]], tolGr.sys_id, currentStageValue, stageCount);
					stageCount++;
				}
			}
		}

	},

	createTask: function(modelCategoryTemplateTaskObj, transferOrderLine, currentTolStageValue, stageCount) {
		// Create task
		var tolTemplateTaskGr = new GlideRecord('alm_transfer_order_line_task');
		tolTemplateTaskGr.initialize();
		tolTemplateTaskGr.short_description = modelCategoryTemplateTaskObj["task_name"];
		tolTemplateTaskGr.order = modelCategoryTemplateTaskObj["order"];
		tolTemplateTaskGr.stage = modelCategoryTemplateTaskObj["stage"];
		tolTemplateTaskGr.model_category = modelCategoryTemplateTaskObj["model_category"];
		tolTemplateTaskGr.transfer_order_line = transferOrderLine;
		tolTemplateTaskGr.template_task = modelCategoryTemplateTaskObj["template_task"];
		if (stageCount <= currentTolStageValue) {
			tolTemplateTaskGr.setValue('state', 3);
		}
		tolTemplateTaskGr.setWorkflow(false);
		tolTemplateTaskGr.insert();
	},

	findTasksForAModelCategory: function(stageToTemplateTask) {
		// Store relevant field information in an object, corresponding to it's stage
		/* Ex: stageToDefaultModelTask [requested] = { "task_name": "Ready for fulfillment",
													"order": 100,
													"stage": "requested",
													"model_category": "9cd8f9b7b94b2300964fbb6da89f2ff3",
													"template_task": "58381eb920132300964fe764b17c9358" }
		*/
		var modelCategoryTemplateTaskGr = new GlideRecord('alm_template_task');
		modelCategoryTemplateTaskGr.addQuery('model_category', TransferOrderLineTemplateTaskAPI.DEFAULT_MODEL_CATEGORY);
		modelCategoryTemplateTaskGr.query();
		while(modelCategoryTemplateTaskGr.next()){
			var stageValue = modelCategoryTemplateTaskGr.getValue('stage');
			var obj = {
				"task_name": modelCategoryTemplateTaskGr.getValue('task_name'),
				"order": modelCategoryTemplateTaskGr.getValue('order'),
				"stage": stageValue,
				"model_category": modelCategoryTemplateTaskGr.model_category,
				"template_task": modelCategoryTemplateTaskGr.getUniqueValue()
			};
			stageToTemplateTask[stageValue] = obj;
		}
		
		return stageToTemplateTask;
	},
		
    type: 'SamUpgradeTransferOrderLines'
};
```