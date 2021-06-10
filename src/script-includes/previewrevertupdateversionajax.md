---
title: "PreviewRevertUpdateVersionAjax"
id: "previewrevertupdateversionajax"
---

API Name: global.PreviewRevertUpdateVersionAjax

```js
var PreviewRevertUpdateVersionAjax = Class.create();

			PreviewRevertUpdateVersionAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
				
				revertToBaseSystemPreview : function (sys_id) {
					// prevent transaction cancellation by quota rules
					var transaction = null;
					var isUncancelable = false;
					try {
						transaction = GlideTransaction.get();
						if (transaction != null) {
							isUncancelable = transaction.isUncancelable();
							transaction.setCannotCancel(true);
						}
						
						this._revert(sys_id);

					} finally {
						if (transaction != null)
							transaction.setCannotCancel(isUncancelable);
					}
				},

				retainCustomizationPreview : function (sys_id) {
					// prevent transaction cancellation by quota rules
					var transaction = null;
					var isUncancelable = false;
					try {
						transaction = GlideTransaction.get();
						if (transaction != null) {
							isUncancelable = transaction.isUncancelable();
							transaction.setCannotCancel(true);
						}

						this._retain(sys_id);

					} finally {
						if (transaction != null)
							transaction.setCannotCancel(isUncancelable);
					}
				},

				_revert: function(sys_id) {
					var previewLogRecord = this._getUpgradePreviewLogRecord(sys_id);
					var fileName = this._getFileName(previewLogRecord);
	
					// current version
					var grHead = GlideappUpdateVersion.getHeadVersion(fileName);
					
					// check permissions
					if (!GlideappUpdateVersion.canWriteRecordInVersion(grHead.sys_id)) {
						gs.addErrorMessage(gs.getMessage('Not allowed to revert this record'));
						return;
					}
						
					// baseline version
					var grBaselineHead = GlideappUpdateVersion.getVersion(fileName, null, "sys_upgrade_history", null);
					if (!grBaselineHead.isValidRecord()) {
						this._sendUINotification(previewLogRecord);						
						return;
					}
						
					// revert
					var glideappUpdateVersion = new GlideappUpdateVersion();
					var isSuccess = glideappUpdateVersion.revert(grBaselineHead.sys_id);
					glideappUpdateVersion.addUINotification();
					this._updatePreviewLogReverted(previewLogRecord, isSuccess);
				},

				_retain: function(sys_id) {
					var previewLogRecord = this._getUpgradePreviewLogRecord(sys_id);
					var fileName = this._getFileName(previewLogRecord);

					// current version
					var grHead = GlideappUpdateVersion.getHeadVersion(fileName);

					// check permissions
					if (!GlideappUpdateVersion.canWriteRecordInVersion(grHead.sys_id)) {
						gs.addErrorMessage(gs.getMessage('Not allowed to write to this record'));
						return;
					}

					// revert to customization if most recently reverted to baseline, otherwise keep customization
					var isSuccess;
					if (grHead.getValue('source_table') === 'sys_upgrade_history') {
						var glideappUpdateVersion = new GlideappUpdateVersion();
						var grVersion = new GlideRecord('sys_update_version');
						grVersion.addQuery('name', fileName);
						grVersion.addQuery('source_table', '!=', 'sys_upgrade_history');
						grVersion.orderByDesc('sys_recorded_at');
						grVersion.query();

						if (grVersion.next())
							isSuccess = glideappUpdateVersion.revert(grVersion.sys_id);
						else
							isSuccess = false;
						glideappUpdateVersion.addUINotification();
					} else {
						isSuccess = true;
					}

					this._updatePreviewLogRetained(previewLogRecord, isSuccess);
				},
							
				_getUpgradePreviewLogRecord: function(sys_id) {
					var previewLogRecord = new GlideRecord('upgrade_preview_log');
					previewLogRecord.get(sys_id);
					
					return previewLogRecord;
				},
				
				_getFileName: function(previewLogRecord) {
					var fileName = previewLogRecord.file_name;
					fileName = fileName.replace('.xml', '');
					
					return fileName;
				},
				
				_sendUINotification: function(previewLogRecord) {
					var gr = new GlideRecord('upgrade_preview');
					gr.get(previewLogRecord.preview);
					var uin = new UINotification();
					uin.setText(gs.getMessage('Your update version entry cannot be reverted because no base system version was found for upgrade {0}', gr.getValue('target_version')));
					uin.send();
				},
				
				_updatePreviewLogReverted: function(previewLogRecord, isSuccess) {
					if (!isSuccess)
						return;
					
					previewLogRecord.disposition = '5';
					previewLogRecord.resolution = 'reverted';
					previewLogRecord.update();
				},

				_updatePreviewLogRetained: function(previewLogRecord, isSuccess) {
					if (!isSuccess)
						return;

					previewLogRecord.disposition = '4';
					previewLogRecord.resolution = 'retained';
					previewLogRecord.update();
				},

				toString: function () {
					return 'PreviewRevertUpdateVersionAjax';
				}
			});
```