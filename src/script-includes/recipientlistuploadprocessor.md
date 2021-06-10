---
title: "RecipientListUploadProcessor"
id: "recipientlistuploadprocessor"
---

API Name: sn_publications.RecipientListUploadProcessor

```js
var RecipientListUploadProcessor = Class.create();
RecipientListUploadProcessor.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
	
	type: 'RecipientListUploadProcessor',
	
	_getTableAndFieldNameForEntity: function(entityType){
		
		var tableName, fieldName, refTable;
		var entityMetaData = {};
			
			if (!entityType) {
				return;
			}
			
			if (entityType == "external" || entityType == "internal"){
				tableName = "sn_publications_recipientslist_user_m2m";
				fieldName = "user";
				refTable = "sys_user";
				if (entityType == "external")
					refTable = "customer_contact";
			}
			
			if (entityType == "consumers") {
				tableName = "sn_publications_recipientslist_consumer_m2m";
				fieldName = "consumer";
				refTable = "csm_consumer";
			}
			
			if (entityType == "accounts") {
				tableName = "sn_publications_recipientslist_account_m2m";
				fieldName = "account";
				refTable = "customer_account";
			}
			entityMetaData["table"] = tableName+"";
			entityMetaData["field"] = fieldName+"";
			entityMetaData["reftable"] = refTable+"";
			
			return entityMetaData;
			
		},
		
		_isValidEntity: function(reftable, entitySysId) {
			var _m2mTypeGr = new GlideRecord(reftable);
			var _isValid;
			if (_m2mTypeGr.get(entitySysId)) {
				_isValid = true;
				if (reftable == 'sys_user') {
					if (_m2mTypeGr.sys_class_name != 'sys_user') {
						_isValid = false;
					}
				}
			}
			return _isValid;
		},
		
		_getSysIdForField: function (reftable, field, value) {
			var sysId="";
			var entityGr = new GlideRecord(reftable);
			entityGr.addQuery(field, "=", value);
			if(reftable == 'sys_user')
				entityGr.addQuery("sys_class_name", "sys_user");
			entityGr.query();
			
			if (entityGr.next()) {
				sysId = entityGr.getUniqueValue();
			}
			return sysId;
		},
		
		_isSysIdValid: function (reftable, sysId) {
			
			var entityGr = new GlideRecord(reftable);
			entityGr.addQuery("sys_id", "=", sysId);
			if(reftable == 'sys_user')
				entityGr.addQuery("sys_class_name", "sys_user");
			entityGr.query();
			
			return (entityGr.hasNext());
			
		},
		
		trackValidateUploadProgress: function(totalRecords) {
			var tracker = GlideExecutionTracker.getLastRunning();
			tracker.run();
			
			for (var k = 0; k < totalRecords; k++) {
				
				if (totalRecords < 100) {
					//determine how many percent to increment for each interval
					var intervalPercentPro = Math.floor(100 / totalRecords);
					tracker.incrementPercentComplete(intervalPercentPro);
				} else {
					//determine number of things for one percent
					var onePercentIntervalPro = Math.floor(totalRecords / 100);
					if (k % onePercentIntervalPro == 0)
						//increment one percent more
					tracker.incrementPercentComplete(1);
				}
				
			}
			tracker.updateResult({
				totalRecordsProcessed: totalRecords
			});
		},
		
		uploadRecords: function(recipientListId, type, m2mTableName, validRecords) {
			
			var tracker = GlideExecutionTracker.getLastRunning();
			tracker.run();
			var count = 0;
			
			var totalRecords = validRecords.length;
			var entityMap = this._getTableAndFieldNameForEntity(type);
			
			for (var k = 0; k < totalRecords; k++) {
				
				if (totalRecords < 100) {
					//determine how many percent to increment for each interval
					var intervalPercentPro = Math.floor(100 / totalRecords);
					tracker.incrementPercentComplete(intervalPercentPro);
				} else {
					//determine number of things for one percent
					var onePercentIntervalPro = Math.floor(totalRecords / 100);
					if (k % onePercentIntervalPro == 0)
						//increment one percent more
					tracker.incrementPercentComplete(1);
				}
				
				if (this._insertExcelRecord(m2mTableName, recipientListId, entityMap["field"], entityMap["reftable"], validRecords[k])) {
					count++;
				}
			}
			tracker.updateResult({
				totalRecordsInserted : count
			});
			return count;
		},
		
		_insertExcelRecord: function(m2mtable, recipientListId, type, refTable, entitySysId) {
			//Create m2m table GlideRecord
			var grId = "";
			var recipientm2mGr = new GlideRecord(m2mtable);
			recipientm2mGr.addQuery('recipients_list',recipientListId);
			recipientm2mGr.addQuery(type, entitySysId);
			recipientm2mGr.query();
			
			if (!recipientm2mGr.hasNext() && this._isValidEntity(refTable, entitySysId)) {
				//Create new recipient list
				recipientm2mGr.setValue('recipients_list',recipientListId);
				recipientm2mGr.setValue(type, entitySysId);
				recipientm2mGr.setValue('dynamically_added', false);
				recipientm2mGr.insert();
				grId = recipientm2mGr.getUniqueValue();
			}
			return grId;
		},
		
		
		validateUploadOperation: function(entityList, entityType, totalRecords) {
			var validateMap = {};
				var entityMap = this._getTableAndFieldNameForEntity(entityType);
				var validSysIds = [];
				
				if (entityList) {
					
					//Iterate through all rows for upload
					for (var _row in entityList) {
						var recipientRow = entityList[_row];
						for (var _field in recipientRow) {
							//Process sys_id
							if (_field == "sys_id" && recipientRow.hasOwnProperty(_field) && !gs.nil(recipientRow[_field])) {
								if (this._isSysIdValid(entityMap["reftable"], recipientRow["sys_id"])) {
									validSysIds.push(recipientRow["sys_id"]);
								} else {
									gs.info("Invalid sys_id " + recipientRow["sys_id"] + " at "+ _row);
								}
							}
							
							//Process non sys_id field(s)
							if (_field != "sys_id" && recipientRow.hasOwnProperty(_field) && !gs.nil(recipientRow[_field])) {
								//Check whether corresponding sys_id has already been processed
								if (recipientRow.hasOwnProperty("sys_id")) {
									if (validSysIds.indexOf(recipientRow["sys_id"]) == -1) {
										var sysIdFromField = this._getSysIdForField(entityMap["reftable"], _field, recipientRow[_field]);
										if (!gs.nil(sysIdFromField)) {
											validSysIds.push(sysIdFromField);
										} else {
											gs.info("Invalid value " + recipientRow[_field] + " for field "+ _field + " at "+ _row);
										}
											
									}
								}
							}
						}
					}
				}
				
				
				validateMap["totalRecords"] = totalRecords;
				validateMap["validRecords"] = validSysIds.length;
				validateMap["invalidRecords"] = totalRecords - validSysIds.length;
				validateMap["validSysIds"] = validSysIds;
				validateMap["recipientm2mTable"] = entityMap["table"];
				
				return validateMap;
			},
		});
```