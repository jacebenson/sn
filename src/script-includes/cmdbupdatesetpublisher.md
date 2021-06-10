---
title: "CMDBUpdateSetPublisher"
id: "cmdbupdatesetpublisher"
---

API Name: global.CMDBUpdateSetPublisher

```js
var CMDBUpdateSetPublisher = Class.create();
CMDBUpdateSetPublisher.prototype = {
    initialize: function(newUpdateSetName, logger) {
        this.logger = logger;
		this.api = new UpdateSetAPI();
        if (newUpdateSetName !== null && newUpdateSetName !== undefined ) {
            this.originUpdateSetId = this.api.getCurrentUpdateSetID();
            this.api.insertUpdateSetAsCurrent(newUpdateSetName);
            this.logger.log('UpdateSet: ' + newUpdateSetName + ' set as current');
        }
        
        this.isForcePublish = false;
        this.manager = new GlideUpdateManager2();
        this.countOfPublishedRecords = 0;
        this.updateSetId = this.api.getCurrentUpdateSetID();
    },
    
    complete: function() {
        this.api.completeUpdateSet(this.updateSetId);
    },
    
    accomplish: function() {
        
        if (this.originUpdateSetId !== undefined) {
            /* Restore the previous UpdateSet to be a current*/
            new GlideUpdateSet().set(this.originUpdateSetId);
            this.logger.log('Original UpdateSet is set to current');
        }else{
            this.logger.error('Failed to set original UpdateSet as current');
        }    
    },
    
    getUpdateSetId: function() {
        return this.updateSetId;
    },
	
	publishMultiple: function (tables, skipLog, isReference, aRef, bRef) {      
        for(var currentTableIndex in tables) {
            var currentTable = tables[currentTableIndex];
            this.publishSingle(currentTable, skipLog, isReference, aRef, bRef);
        }
	},
    
    publishSingle: function (table, skipLog, isReference, aRef, bRef) {      
        this._publish(table, skipLog, isReference, aRef, bRef);
	},
       
    _publish: function (gr, skipLog, isReference, aRef, bRef) {
        if (gr === null)
            return;
        var tableName = gr.getTableName();
		
        while(gr.next()) {
            if (!this._isRecordExist(gr) && !this.isForcePublish) {
                this.manager.saveRecord(gr);
                if (skipLog === undefined || (skipLog !== undefined && skipLog === false)){
                    if(isReference === undefined || (isReference !== undefined && isReference === false))
                        this.logger.log('Exporting record: [' + tableName + '] ' + gr.getDisplayValue());
                    else
                        this.logger.log('Exporting record: [' + tableName + '] Reference: '  + gr.getElement(aRef).getDisplayValue() + '->' + gr.getElement(bRef).getDisplayValue());
                }
                    
                //this.__publish(gr);
                this.countOfPublishedRecords ++;
            }
        }
	},
    
    _isRecordExist: function(gr) {
        var upGr = new GlideRecord('sys_update_xml');
        upGr.addQuery('name', gr.getTableName()+ '_' + gr.sys_id);
        upGr.addQuery('update_set', this.updateSetId);
        upGr.query();
        if (upGr.hasNext())
            return true;
        return false;
    },
    
    getCountOfPublishedRecords: function () {      
        return this.countOfPublishedRecords;
	},
    
    
    __publish: function(gr) {
        var upGr = new GlideRecord('sys_update_xml');
        upGr.addQuery('name', this.manager.getUpdateName(gr));
        upGr.addQuery('update_set', this.updateSetId);
        upGr.query();
        if (upGr.hasNext())
            return;
        upGr.initialize();
        upGr.setValue('category', 'customer');
        upGr.setValue('name', this.manager.getUpdateName(gr));
        upGr.setValue('update_domain','global');
        var targetName;
        if (gr.name)
            targetName = gr.name;
        else
            targetName = gr.sys_id;

        upGr.setValue('target_name', targetName);
        upGr.setValue('update_set', updateSetId);
        upGr.setValue('payload', gs.unloadRecordToXML(gr,false));
        upGr.setValue('action', 'INSERT_OR_UPDATE');
        var descriptor = GlideTableDescriptor.get(gr.getTableName());
        upGr.setValue('type', descriptor.getLabel());
        upGr.insert();
    },
    
    type: 'CMDBUpdateSetPublisher'
};


/*Static function for delete */
CMDBUpdateSetPublisher.deleteUpdateSet = function(updateSetToDelete) {
        var gr = new GlideRecord('sys_update_xml');
        gr.addQuery('update_set', updateSetToDelete);
        gr.setWorkflow(false);
        gr.deleteMultiple();
        
        var gr2 = new GlideRecord('sys_remote_update_set');
        gr2.addQuery('remote_sys_id', updateSetToDelete);
        gr2.query();
        if(gr2.next()){
            gr2.setWorkflow(false);
            gr2.deleteRecord();  
        }

        var gr3 = new GlideRecord('sys_update_set');
        gr3.addQuery('sys_id', updateSetToDelete);
        gr3.query();
        if(gr3.next()){
            gr3.setWorkflow(false);
            gr3.deleteRecord();  
        }
};
```