---
id: glideform
title: GlideForm
---


# g_form aka GlideForm

g_form is used very heavily all over in ServiceNow.\
As such it has a lot of documented and undocumented functions.\
Below I go over all of them;

-   [Standard
    g_form](https://docs.servicenow.com/bundle/kingston-application-development/page/app-store/dev_portal/API_reference/GlideForm/concept/c_GlideFormAPI.html)
-   [Standard g_form
    code](https://github.com/jacebenson/sndocs/blob/master/sources/jakarta/4/scripts/doctype/GlideForm14.js)
-   [Mobile
    g_form](https://docs.servicenow.com/bundle/kingston-application-development/page/app-store/dev_portal/API_reference/MobileGlideForm/concept/c_MobileGlideForm_API.html)
-   [Mobile g_form
    code](https://github.com/jacebenson/sndocs/blob/master/sources/jakarta/4/scripts/sn/common/clientScript/glideFormFactory.js)

| Property / Method             | Desktop                                   | Mobile/SP                             | Documented |
|:------------------------------|:------------------------------------------|:--------------------------------------|:-----------|
| activateTab                   | [Desktop](#desktop-activatetab)                   |                                       | No         |
| addAttribute                  | [Desktop](#desktop-addattribute)                  |                                       | No         |
| addDecoration                 | [Desktop](#desktop-adddecoration)                 | [Mobile](#mobile-adddecoration)       | Both       |
| addErrorMessage               | [Desktop](#desktop-adderrormessage)               | [Mobile](#mobile-adderrormessage)     | Desktop    |
| addGlideUIElement             | [Desktop](#desktop-addglideuielement)             |                                       | No         |
| addInfoMessage                | [Desktop](#desktop-addinfomessage)                | [Mobile](#mobile-addinfomessage)      | Desktop    |
| addNameMapEntry               | [Desktop](#desktop-addnamemapentry)               |                                       | No         |
| addOption                     | [Desktop](#desktop-addoption)                     | [Mobile](#mobile-addoption)           | Desktop    |
| addSecurityReadOnlyFields     | [Desktop](#desktop-addsecurityreadonlyfields)     |                                       | No         |
| addToCart                     | [Desktop](#desktop-addtocart)                     |                                       | No         |
| addValidator                  | [Desktop](#desktop-addvalidator)                  |                                       | No         |
| addWarningMessage             | [Desktop](#desktop-addwarningmessage)             |                                       | No         |
| allChangedFieldsFilter        | [Desktop](#desktop-allchangedfieldsfilter)        |                                       | No         |
| changedFieldsFilter           | [Desktop](#desktop-changedfieldsfilter)           |                                       | No         |
| changeElementParent           | [Desktop](#desktop-changeelementparent)           |                                       | No         |
| changeElementStyle            | [Desktop](#desktop-changeelementstyle)            |                                       | No         |
| clearMessages                 | [Desktop](#desktop-clearmessages)                 | [Mobile](#mobile-clearmessages)       | Desktop    |
| clearOptions                  | [Desktop](#desktop-clearoptions)                  | [Mobile](#mobile-clearoptions)        | Desktop    |
| clearValue                    | [Desktop](#desktop-clearvalue)                    | [Mobile](#mobile-clearvalue)          | Desktop    |
| disable                       | [Desktop](#desktop-disable)                       |                                       | No         |
| disableAttachments            | [Desktop](#desktop-disableattachments)            |                                       | Desktop    |
| enable                        | [Desktop](#desktop-enable)                        |                                       | No         |
| enableAttachments             | [Desktop](#desktop-enableattachments)             |                                       | Desktop    |
| enableOption                  | [Desktop](#desktop-enableoption)                  |                                       | No         |
| enableUIPolicyFields          | [Desktop](#desktop-enableuipolicyfields)          |                                       | No         |
| fieldChanged                  | [Desktop](#desktop-fieldchanged)                  |                                       | No         |
| findV2RelatedListName         | [Desktop](#desktop-findv2relatedlistname)         |                                       | No         |
| flash                         | [Desktop](#desktop-flash)                         |                                       | Desktop    |
| getAction                     | [Desktop](#desktop-getaction)                     |                                       | No         |
| getActionName                 | [Desktop](#desktop-getactionname)                 | [Mobile](#mobile-getactionname)       | Desktop    |
| getBooleanValue               | [Desktop](#desktop-getbooleanvalue)               | [Mobile](#mobile-getbooleanvalue)     | Desktop    |
| getControl                    | [Desktop](#desktop-getcontrol)                    |                                       | Desktop    |
| getControlByForm              | [Desktop](#desktop-getcontrolbyform)              |                                       | No         |
| getDecimalValue               | [Desktop](#desktop-getdecimalvalue)               | [Mobile](#mobile-getdecimalvalue)     | Desktop    |
| getDerivedFields              | [Desktop](#desktop-getderivedfields)              |                                       | No         |
| getDisplayBox                 | [Desktop](#desktop-getdisplaybox)                 |                                       | No         |
| getDisplayValue               | [Desktop](#desktop-getdisplayvalue)               | [Mobile](#mobile-getdisplayvalue)     | No         |
| getEditableFields             | [Desktop](#desktop-geteditablefields)             |                                       | No         |
| getElement                    | [Desktop](#desktop-getelement)                    |                                       | Desktop    |
| getEncodedRecord              |                                           | [Mobile](#mobile-getencodedrecord)    | No         |
| getFieldNames                 |                                           | [Mobile](#mobile-getfieldnames)       | No         |
| getFormElement                | [Desktop](#desktop-getformelement)                |                                       | Desktop    |
| getGlideUIElement             | [Desktop](#desktop-getglideuielement)             |                                       | No         |
| getHelpTextControl            | [Desktop](#desktop-gethelptextcontrol)            |                                       | Desktop    |
| getIntValue                   | [Desktop](#desktop-getintvalue)                   | [Mobile](#mobile-getintvalue)         | Desktop    |
| getLabel                      | [Desktop](#desktop-getlabel)                      | [Mobile](#mobile-getlabel)            | Mobile     |
| getLabelOf                    | [Desktop](#desktop-getlabelof)                    |                                       | Desktop    |
| getMissingFields              | [Desktop](#desktop-getmissingfields)              |                                       | No         |
| getNiBox                      | [Desktop](#desktop-getnibox)                      |                                       | No         |
| getOption                     | [Desktop](#desktop-getoption)                     |                                       | Desktop    |
| getOptionControl              | [Desktop](#desktop-getoptioncontrol)              |                                       | No         |
| orderNow                      | [Desktop](#desktop-ordernow)                      |                                       | No         |
| getField                      |                                           | [Mobile](#mobile-getfield)            | No         |
| getParameter                  | [Desktop](#desktop-getparameter)                  |                                       | No         |
| getPrefixHandler              | [Desktop](#desktop-getprefixhandler)              |                                       | No         |
| getReference                  | [Desktop](#desktop-getreference)                  | [Mobile](#mobile-getreference)        | Desktop    |
| getRelatedListNames           | [Desktop](#desktop-getrelatedlistnames)           | [Mobile](#mobile-getrelatedlistnames) | No         |
| getScope                      | [Desktop](#desktop-getscope)                      |                                       | No         |
| getSectionNames               | [Desktop](#desktop-getsectionnames)               | [Mobile](#mobile-getsectionnames)     | Desktop    |
| getSections                   | [Desktop](#desktop-getsections)                   |                                       | Desktop    |
| getSysId                      |                                           | [Mobile](#mobile-getsysid)            | No         |
| getTableName                  | [Desktop](#desktop-gettablename)                  | [Mobile](#mobile-gettablename)        | Desktop    |
| getTabNameForField            | [Desktop](#desktop-gettabnameforfield)            |                                       | No         |
| getTitle                      | [Desktop](#desktop-gettitle)                      |                                       | No         |
| getUniqueValue                | [Desktop](#desktop-getuniquevalue)                | [Mobile](#mobile-getuniquevalue)      | Desktop    |
| getValue                      | [Desktop](#desktop-getvalue)                      | [Mobile](#mobile-getvalue)            | Desktop    |
| getViewName                   | [Desktop](#desktop-getviewname)                   | [Mobile](#mobile-getviewname)         | No         |
| hasAttribute                  | [Desktop](#desktop-hasattribute)                  |                                       | No         |
| hasField                      | [Desktop](#desktop-hasfield)                      | [Mobile](#mobile-hasfield)            | Both       |
| hasFieldMsgs                  | [Desktop](#desktop-hasfieldmsgs)                  |                                       | No         |
| hideAllFieldMsgs              | [Desktop](#desktop-hideallfieldmsgs)              | [Mobile](#mobile-hideallfieldmsgs)    | Desktop    |
| hideErrorBox                  | [Desktop](#desktop-hideerrorbox)                  | [Mobile](#mobile-hideerrorbox)        | Desktop    |
| hideFieldMsg                  | [Desktop](#desktop-hidefieldmsg)                  | [Mobile](#mobile-hidefieldmsg)        | Desktop    |
| hideRelatedList               | [Desktop](#desktop-hiderelatedlist)               | [Mobile](#mobile-hiderelatedlist)     | Desktop    |
| hideRelatedLists              | [Desktop](#desktop-hiderelatedlists)              | [Mobile](#mobile-hiderelatedlists)    | Desktop    |
| isDatabaseView                | [Desktop](#desktop-isdatabaseview)                |                                       | No         |
| isDisabled                    | [Desktop](#desktop-isdisabled)                    |                                       | No         |
| isDisplayNone                 | [Desktop](#desktop-isdisplaynone)                 |                                       | No         |
| isEditableField               | [Desktop](#desktop-iseditablefield)               |                                       | No         |
| isInteger                     | [Desktop](#desktop-isinteger)                     |                                       | No         |
| isLiveUpdating                | [Desktop](#desktop-isliveupdating)                |                                       | Desktop    |
| isMandatory                   | [Desktop](#desktop-ismandatory)                   | [Mobile](#mobile-ismandatory)         | Desktop    |
| isNewRecord                   | [Desktop](#desktop-isnewrecord)                   | [Mobile](#mobile-isnewrecord)         | Desktop    |
| isNumeric                     | [Desktop](#desktop-isnumeric)                     |                                       | No         |
| isReadOnly                    | [Desktop](#desktop-isreadonly)                    | [Mobile](#mobile-isreadonly)          | No         |
| isSectionVisible              | [Desktop](#desktop-issectionvisible)              |                                       | Desktop    |
| isTemplateCompatible          | [Desktop](#desktop-istemplatecompatible)          |                                       | No         |
| isUserPersonalizedField       | [Desktop](#desktop-isuserpersonalizedfield)       |                                       | No         |
| isVisible                     | [Desktop](#desktop-isvisible)                     | [Mobile](#mobile-isvisible)           | No         |
| mandatoryCheck                | [Desktop](#desktop-mandatorycheck)                |                                       | No         |
| onSubmit                      | [Desktop](#desktop-onsubmit)                      |                                       | No         |
| registerHandler               | [Desktop](#desktop-registerhandler)               |                                       | No         |
| registerPrefixHandler         | [Desktop](#desktop-registerprefixhandler)         |                                       | No         |
| removeAllDecorations          | [Desktop](#desktop-removealldecorations)          |                                       | No         |
| removeContextItem             | [Desktop](#desktop-removecontextitem)             |                                       | No         |
| removeCurrentPrefix           | [Desktop](#desktop-removecurrentprefix)           |                                       | No         |
| refreshSlushbucket            | [Desktop](#desktop-refreshslushbucket)            |                                       | Desktop    |
| removeDecoration              | [Desktop](#desktop-removedecoration)              | [Mobile](#mobile-removedecoration)    | Both       |
| removeItem                    | [Desktop](#desktop-removeitem)                    |                                       | No         |
| removeOption                  | [Desktop](#desktop-removeoption)                  | [Mobile](#mobile-removeoption)        | Desktop    |
| resetPersonalizeHiddenFields  | [Desktop](#desktop-resetpersonalizehiddenfields)  |                                       | No         |
| resolveLabelNameMap           | [Desktop](#desktop-resolvelabelnamemap)           |                                       | No         |
| resolveNameMap                | [Desktop](#desktop-resolvenamemap)                |                                       | No         |
| resolvePrettyNameMap          | [Desktop](#desktop-resolveprettynamemap)          |                                       | No         |
| save                          | [Desktop](#desktop-save)                          | [Mobile](#mobile-save)                | Desktop    |
| serialize                     | [Desktop](#desktop-serialize)                     | [Mobile](#mobile-serialize)           | No         |
| serializeChanged              | [Desktop](#desktop-serializechanged)              |                                       | No         |
| serializeChangedAll           | [Desktop](#desktop-serializechangedall)           |                                       | No         |
| serializeTargetFields         | [Desktop](#desktop-serializetargetfields)         |                                       | No         |
| setAction                     | [Desktop](#desktop-setaction)                     |                                       | No         |
| setDisabled                   | [Desktop](#desktop-setdisabled)                   | [Mobile](#mobile-setdisabled)         | No         |
| setDisabledControl            | [Desktop](#desktop-setdisabledcontrol)            |                                       | No         |
| setDisplay                    | [Desktop](#desktop-setdisplay)                    |                                       | No         |
| setFieldPlaceholder           |                                           | [Mobile](#mobile-setfieldplaceholder) | No         |
| setLabel                      |                                           | [Mobile](#mobile-setlabel)            | Mobile     |
| setLabelOf                    | [Desktop](#desktop-setlabelof)                    | [Mobile](#mobile-setlabelof)          | Desktop    |
| setLiveUpdating               | [Desktop](#desktop-setliveupdating)               |                                       | No         |
| setMandatory                  | [Desktop](#desktop-setmandatory)                  | [Mobile](#mobile-setmandatory)        | Desktop    |
| setMandatoryOnlyIfModified    | [Desktop](#desktop-setmandatoryonlyifmodified)    |                                       | No         |
| setReadOnly                   | [Desktop](#desktop-setreadonly)                   | [Mobile](#mobile-setreadonly)         | Desktop    |
| setReadonly                   | [Desktop](#desktop-setreadonly)                   | [Mobile](#mobile-setreadonly)         | No         |
| setRequiredChecked            | [Desktop](#desktop-setrequiredchecked)            |                                       | No         |
| setScope                      | [Desktop](#desktop-setscope)                      |                                       | No         |
| setSectionDisplay             | [Desktop](#desktop-setsectiondisplay)             | [Mobile](#mobile-setsectiondisplay)   | No         |
| setSensitiveDisplayValue      | [Desktop](#desktop-setsensitivedisplayvalue)      |                                       | No         |
| setStreamJournalFieldsDisplay | [Desktop](#desktop-setstreamjournalfieldsdisplay) |                                       | No         |
| setTemplateValue              | [Desktop](#desktop-settemplatevalue)              |                                       | No         |
| setUserDisplay                | [Desktop](#desktop-setuserdisplay)                |                                       | No         |
| setValidation                 | [Desktop](#desktop-setvalidation)                 |                                       | No         |
| setValue                      | [Desktop](#desktop-setvalue)                      | [Mobile](#mobile-setvalue)            | Desktop    |
| setVariablesReadOnly          | [Desktop](#desktop-setvariablesreadonly)          |                                       | No         |
| setVisible                    | [Desktop](#desktop-setvisible)                    | [Mobile](#mobile-setvisible)          | Desktop    |
| showErrorBox                  | [Desktop](#desktop-showerrorbox)                  | [Mobile](#mobile-showerrorbox)        | Desktop    |
| showFieldMsg                  | [Desktop](#desktop-showfieldmsg)                  | [Mobile](#mobile-showfieldmsg)        | Desktop    |
| showRelatedList               | [Desktop](#desktop-showrelatedlist)               | [Mobile](#mobile-showrelatedlist)     | Desktop    |
| showRelatedLists              | [Desktop](#desktop-showrelatedlists)              | [Mobile](#mobile-showrelatedlists)    | Desktop    |
| submit                        | [Desktop](#desktop-submit)                        | [Mobile](#mobile-submit)              | Desktop    |
| validate                      | [Desktop](#desktop-validate)                      |                                       | No         |

These methods I've found in the script that dictates it's available on
the portal/mobile clients.\
At the time of this writing that is
service-now.com[/scripts/sn/common/clientScript/glideFormFactory.js](https://github.com/jacebenson/sndocs/blob/master/sources/jakarta/4/scripts/sn/common/clientScript/glideFormFactory.js)

## Mobile addDecoration

Adds an icon on a field's label. This method is available starting with
the Fuji release. Icons available
[here](https://hi.service-now.com/styles/retina_icons/retina_icons.html)
Adding the same item twice is prevented; however, you can add the same
icon with a different title.

```js
 g_form.addDecoration('caller_id', 'icon-star', 'VIP');
```

## Mobile getLabel

```js
 if (g_user.hasRole('itil')) {
    // getLabel returns the label for the field listed
    // I'd suggest using getLabelOf as it's supported
    // both on desktop and on mobile / sp
    var oldLabel = g_form.getLabel('comments');
    g_form.setLabel('comments', oldLabel + ' (Customer visible)');
 }
```

## Mobile hasField

```js
 // returns true if form has 'assignment group';
 g_form.hasField('assignment_group');
```

## Mobile removeDecoration

```js
 // this removes a decoration
 g_form.removeDecoration('caller_id', 'icon-star', 'VIP');
```

## Mobile setLabel

```js
 if (g_user.hasRole('itil')) {
    var oldLabel = g_form.getLabel('comments');
    g_form.setLabel('comments', oldLabel + ' (Customer visible)');
 }
```

### Mobile Undocumented

## Mobile addErrorMessage

Displays an error message at the top of the form

```js
 g_form.addErrorMessage('ERROR!');
```

## Mobile addInfoMessage

Displays an informational message at the top of the form

```js
 g_form.addInfoMessage('The top five fields in this form are mandatory');
```

## Mobile addOption

Adds a choice to a choice list field If the index is not specified, the
choice is added to the end of the list.

Optional: Use the index field to specify a particular place in the list

```js
 g_form.addOption('priority', '6', '6 - Really Low');
 g_form.addOption('priority', '2.5', '2.5 - Moderately High', 3);
```

## Mobile clearMessages

Removes all informational and error messages from the top of the form.

Removes informational and error messages added with
`g_form.addInfoMessage()` and `g_form.addErrorMessage()`.

```js
 g_form.clearMessages();
```

## Mobile clearOptions

Removes all options from a choice list

```js
 g_form.clearOptions('priority');
```

## Mobile clearValue

Removes any value(s) from the specified field

```js
g_form.clearValue('short_desciption');
```

## Mobile getActionName

Returns the most recent action name or, for a client script, the sys\_id
of the UI Action clicked Note: not available to Wizard Client Scripts

```js
 function onSubmit() {
   var action = g_form.getActionName();
   console.log('You pressed ' + action);
 }
```

## Mobile getBooleanValue

Returns false if the field's value is false or undefined, otherwise true
is returned. Useful with checkbox fields Returns true when the checkbox
is checked

```js
 // Returns false if the field value is false or undefined;
 // otherwise returns true.
 var active = g_form.getBooleanValue('active');
```

## Mobile getDecimalValue

```js
 function onChange(control, oldValue, newValue, isLoading) {
   console.log(g_form.getDecimalValue('percent_complete'));
 }
```

## Mobile getDisplayValue

```js
 g_form.getDisplayValue();//returns record displayvalue, not field displayvalue
 g_form.getDispalyValue('caller_id');//returns record displayvalue, not field displayvalue
```

## Mobile getEncodedRecord

```js
 // returns '' or _options.encodedRecord normally that's null
 // I don't see when that would be set to something else.  Doesn't
 // seem to work on catalog items, or on form's in service portal.
 g_form.getEncodedRecord();
```

## Mobile getField

This is undocumented and I havent been able to find or test this yet,
however it comes from this source;
<https://community.servicenow.com/community?id=community_question&sys_id=2a151ed0db262b4011762183ca961957$answer_fe97e3bfdb4ef304f21f5583ca961964#answer_fe97e3bfdb4ef304f21f5583ca961964>

```js
// this code is to limit a multirowvariableset to two rows
function onLoad() {
    var field = g_form.getField("uk_billing_invoice_details_new");
    if (field != null) {
        field.max_rows_size = 2;
    }
}
```

## Mobile getFieldNames

```js
 g_form.getFieldNames();
 // returns array of strings of fields (and derived fields)
```

## Mobile getIntValue

```js
 function onChange(control, oldValue, newValue, isLoading) {
   console.log(g_form.getIntValue('state'));
 }
```

## Mobile getLabelOf

```js
 if (g_user.hasRole('itil')) {
    var oldLabel = g_form.getLabelOf('comments');
    g_form.setLabelOf('comments', oldLabel + ' (Customer visible)');
 }
```

## Mobile getReference

```js
 function onChange(control, oldValue, newValue, isLoading) {
   var caller = g_form.getReference('caller_id', function(reference){
       if (reference.vip == 'true') {
            console.log('Caller is a VIP!');
       }
   });
}
```

## Mobile getRelatedListNames

```js
 // Returns all related table.refernce related lists
 // This is in the form of an array of strings.
 g_form.getRelatedListNames();
```

## Mobile getSectionNames

```js
 // Returns all section names, whether visible or not.
 // This is in the form of an array of strings.
 g_form.getSectionNames();
```

## Mobile getSysId

```js
 function onLoad() {
    var incSysid = g_form.getSysId();
    console.log(incSysid);
 }
```

## Mobile getTableName

```js
 function onLoad() {
    if (g_form.isNewRecord() {
         var tableName = g_form.getTableName(); //Get the table name
    }
 }
```

## Mobile getUniqueValue

```js
 function onLoad() {
    var incSysid = g_form.getUniqueValue();
    console.log(incSysid);
 }
```

## Mobile getValue

```js
 function onSubmit() {
   if (g_form.getValue('source') == "url"){
       return true;
   }
 }
```

## Mobile getViewName

```js
 // Returns the view name
 // Doesn't seem to work on service portal
 g_form.getViewName();
```

## Mobile hideAllFieldMsgs

```js
 // Hides all field messages.
 g_form.hideAllFieldMsgs();
```

## Mobile hideErrorBox

```js
 // Hides the error message placed by showErrorBox().
 // Whenever possible, use hideFieldMsg() rather
 // than this method whenever possible.
 g_form.hideErrorBox('priority');
```

## Mobile hideFieldMsg

```js
 g_form.hideFieldMsg('priority', false);//hides last message
 g_form.hideFieldMsg('priority', true);//hides all messages
```

## Mobile hideRelatedList

```js
// This method is not available on the mobile platform.
// If this method is run on a mobile platform, no action occurs.
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || newValue === '') {
    return;
  }
  if(newValue == 'hide'){
    g_form.hideRelatedList('sc_request');
  } else if(newValue == 'show') {
    g_form.showRelatedList('sc_request');
  } else if(newValue == 'hide all'){
    g_form.hideRelatedLists();
  } else if(newValue == 'show all'){
    g_form.showRelatedLists();
  }
}
```

## Mobile hideRelatedLists

```js
 // This method is not available on the mobile platform.
 // If this method is run on a mobile platform, no action occurs.
 function onChange(control, oldValue, newValue, isLoading, isTemplate) {
     if (isLoading || newValue === '') {
         return;
     }
     if (newValue == 'hide') {
         g_form.hideRelatedList('sc_request');
     } else if (newValue == 'show') {
         g_form.showRelatedList('sc_request');
     } else if (newValue == 'hide all') {
         g_form.hideRelatedLists();
     } else if (newValue == 'show all') {
         g_form.showRelatedLists();
     }
 }
```

## Mobile isMandatory

```js
 // Returns true or false if field is mandatory.
 var isPriorityMandatory = g_form.isMandatory('priority');
```

## Mobile isNewRecord

```js
 // returns true if record has a sys_id of -1
 g_form.isNewRecord();
```

## Mobile isReadOnly

```js
 // returns true if field is read only
 g_form.isReadOnly('stage');
```

## Mobile isVisible

```js
 // returns true if field is visible
 g_form.isReadOnly('stage');
```

## Mobile removeOption

```js
 g_form.removeOption('field','value');
```

## Mobile save

```js
 // doesn't appear to work on service portal id=form
 // depends on g_form.submit
```

## Mobile serialize

```js
 // expects true/false
 // true = only "dirty" fields
 var serializedArr = g_form.serialize(false);
```

## Mobile setDisabled

```js
 g_form.setDisabled('quantity',true);// changes field to disabled or not
```

## Mobile setDisplay

```js
 g_form.setDisplay('quantity',true);// changes field to displayed or not
```

## Mobile setFieldPlaceholder

```js
g_form.setFieldPlaceholder('field','placeholder');
```

## Mobile setLabelOf

```js
 g_form.setLabelOf('stage','My custom stage');
```

## Mobile setMandatory

```js
g_form.setMandatory('quantity',true);// changes field to required or not
```

## Mobile setReadOnly

```js
 g_form.setReadOnly('stage',false);// changes field to read only or not
```

## Mobile setReadonly

```js
 g_form.setReadonly('stage',false);// changes field to read only or not
```

## Mobile setSectionDisplay

```js
 // not sure how to test, depends on _options.sections which aren't set most the time
 // i'd guess it's called like this;
 g_form.setSectionDisplay();
```

## Mobile setValue

```js
g_form.setValue('quantity','10');// sets the value to 10
```

## Mobile setVisible

```js
function onLoad() {
  if(this.location.pathname === "/support"){
    try{
      //console.log('Making environment and lifecycle not mandatory and not display');
      g_form.setMandatory('u_environment', false);
      g_form.setMandatory('u_lifecycle_indicator', false);
      g_form.setVisible('u_environment', false);
      g_form.setVisible('u_lifecycle_indicator', false);
    } catch (error){
      console.log('path===/support', error);
    }
  } else {
    try{
    //console.log('Making environment and lifecycle mandatory and display');
      g_form.setMandatory('u_environment', true);
      g_form.setMandatory('u_lifecycle_indicator', true);
      g_form.setVisible('u_environment', true);
      g_form.setVisible('u_lifecycle_indicator', true);
    } catch (error){
      console.log('path!==/support', error);
    }
  }
}
```

## Mobile showErrorBox

The `showErrorBox()` and `hideErrorBox()` are still available but simply
call the new methods with type of error. You should use the new methods.

```js
  var scroll = true;
  g_form.showErrorBox('field','message',scroll);
```

## Mobile showFieldMsg

```js
 // parameters are;
 // field, string, info||error, scrollToField
 g_form.showFieldMsg('stage', 'text info', 'info', false);
 g_form.showFieldMsg('stage', 'text erro', 'error', false);
```

## Mobile showRelatedList

```js
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || newValue === '') {
    return;
  }
  if(newValue == 'hide'){
    g_form.hideRelatedList('sc_request');
  } else if(newValue == 'show') {
    g_form.showRelatedList('sc_request');
  } else if(newValue == 'hide all'){
    g_form.hideRelatedLists();
  } else if(newValue == 'show all'){
    g_form.showRelatedLists();
  }
}
```

## Mobile showRelatedLists

```js
 function onChange(control, oldValue, newValue, isLoading, isTemplate) {
   if (isLoading || newValue === '') {
      return;
   }
   if(newValue == 'hide'){
     g_form.hideRelatedList('sc_request');
   } else if(newValue == 'show') {
     g_form.showRelatedList('sc_request');
   } else if(newValue == 'hide all'){
     g_form.hideRelatedLists();
  } else if(newValue == 'show all'){
    g_form.showRelatedLists();
  }
}
```

## Mobile submit

```js
 // doesn't appear to work on service portal id=form
```

## Desktop

### Desktop Documented

## Desktop addDecoration

Adds an icon on a field's label. This method is available starting with
the Fuji release. Icons available
[here](https://hi.service-now.com/styles/retina_icons/retina_icons.html)
Adding the same item twice is prevented; however, you can add the same
icon with a different title.

Note: This method is not supported by Service Catalog.

```js
 g_form.addDecoration('caller_id', 'icon-star', 'preferred member');
 g_form.addDecoration('caller_id', 'icon-star', 'Mark as Favorite', 'color-green');
```

## Desktop addErrorMessage

Displays the error message at the top of the form.

```js
 g_form.addErrorMessage('This is an error');
```

## Desktop addInfoMessage

Displays an informational message at the top of the form

```js
 g_form.addInfoMessage('The top five fields in this form are mandatory');
```

## Desktop addOption

Adds a choice to a choice list field If the index is not specified, the
choice is added to the end of the list.

Optional: Use the index field to specify a particular place in the list

```js
 g_form.addOption('priority', '6', '6 - Really Low');
 g_form.addOption('priority', '2.5', '2.5 - Moderately High', 3)
```

## Desktop clearMessages

Removes all informational and error messages from the top of the form.

Removes informational and error messages added with
`g_form.addInfoMessage()` and `g_form.addErrorMessage()`.

```js
 g_form.clearMessages();
```

## Desktop clearOptions

Removes all options from a choice list

```js
 g_form.clearOptions('priority');
```

## Desktop clearValue

Removes any value(s) from the specified field

```js
g_form.clearValue('short_desciption');
```

## Desktop disableAttachments

Prevents new file attachments from being added Hides the paperclip icon.
See also: enableAttachments()

```js
g_form.disableAttachments();
```

## Desktop enableAttachments

Allows new file attachments to be added Shows the paperclip icon. See
also: disableAttachments()

```js
g_form.enableAttachments();
```

## Desktop flash

Flashes the specified color the specified number of times in the field.
Used to draw attention to a particular field.

This method is not supported by Service Catalog.

This method is not available on the mobile platform. If this method is
run on a mobile platform, no action occurs.

The third parameter operates with the following inputs;

| Input | Action         |
|-------|----------------|
| 2     | 1 second flash |
| 0     | 2 second flash |
| -2    | 3 second flash |
| -4    | 4 second flash |

```js
g_form.flash('incident.caller_id','red',2);
```

## Desktop getActionName

Returns the most recent action name or, for a client script, the sys\_id
of the UI Action clicked Note: not available to Wizard Client Scripts

```js
  function onSubmit() {
   var action = g_form.getActionName();
   console.log('You pressed ' + action);
 }
```

## Desktop getBooleanValue

Returns false if the field's value is false or undefined, otherwise true
is returned. Useful with checkbox fields Returns true when the checkbox
is checked

```js
 // Returns false if the field value is false or undefined;
 // otherwise returns true.
 var active = g_form.getBooleanValue('active');
```

## Desktop getControl

Returns the HTML element for the specified field Compound fields may
contain several HTML elements. Generally not necessary as there are
built-in methods that use the fields on the form

```js
  g_form.getControl('caller_id');//returns html element for field.
```

## Desktop getDecimalValue

Returns the decimal value of the specified field

```js
  g_form.getDecimalValue('percent_complete')
```

## Desktop getElement

Returns the HTML element for the field specified via the ID Compound
fields may contain several HTML elements. Generally not necessary as
there are built-in methods that use the fields on the form

```js
  g_form.getElement('caller_id');//returns html element for field.
```

## Desktop getFormElement

Returns the HTML element for the form.

This method is not available in mobile scripts or Service Portal
scripts.

```js
 //Can't test, not available on the global scope in the console.
 g_form.getFormElement();
```

## Desktop getHelpTextControl

Returns the HTML element of the help text for the specified field.

This method is applicable to service catalog variables only.

```js
 //Can't test, not available on the global scope in the console.
 g_form.getHelpTextControl('myspecialvariable');
```

## Desktop getIntValue

Returns the value of the specified field as an integer An empty value
returns 0

```js
 g_form.getIntValue('priority');//returns 4 as a interger
 g_form.getValue('priority');//returns 4 as a string
```

## Desktop getLabelOf

Gets the plain text value of the field label. This method is available
starting with the Fuji release

```js
 g_form.getLabelOf('caller_id');// returns the displayed label for field
```

## Desktop getOption

Returns the `<option>` element for a select box named fieldName and
where choiceValue matches the option value Returns null if the field is
not found or the option is not found

```js
 g_form.getOption('priority', 1);// returns html element for <option>
```

## Desktop getReference

Returns the GlideRecord for a specified field getReference() accepts a
second parameter, a callback function Warning: This requires a call to
the server so using this function will require additional time and may
introduce latency to your page

```js
 function onChange(control, oldValue, newValue, isLoading) {
   var caller = g_form.getReference('caller_id', function(reference){
       if (reference.vip == 'true') {
            console.log('Caller is a VIP!');
       }
   });
}
```

## Desktop getSectionNames

Returns all section names, whether visible or not, in an array This
method is available starting with the Fuji release

```js
 g_form.getSectionNames();//returns array of strings;
 // e.g. ["notes", "related_records", "closure_information"]
```

## Desktop getSections

Returns the elements for the form's sections in an array

```js
  g_form.getSectionNames();//returns array of elements;
```

## Desktop getTableName

Returns the name of the table this record belongs to

```js
 g_form.getTableName();//returns string of table, e.g. "incident"
```

## Desktop getUniqueValue

Returns the sys\_id of the record displayed in the form

```js
 g_form.getUniqueValue(); // returns sys_id of recrod
```

## Desktop getValue

Returns the value of the specified field

```js
 g_form.getValue('caller_id');// returns value of field
```

## Desktop hideAllFieldMsgs

Hides all field messages. `<type>` paramter is optional

```js
g_form.hideAllFieldMsgs('info');
g_form.hideAllFieldMsgs();
```

## Desktop hideErrorBox

Hides the error message placed by showErrorBox()

Whenever possible, use hideFieldMsg() rather than this method whenever
possible.

```js
g_form.hideErrorBox('caller_id');
```

## Desktop hideFieldMsg

Hides the message placed by showFieldMsg();

```js
  g_form.hideFieldMsg('caller_id');
  var clearAll = true;
  g_form.hideFieldMsg('caller_id', clearAll);
```

## Desktop hideRelatedList

Hides the specified related list on the form

```js
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || newValue === '') {
    return;
  }
  if(newValue == 'hide'){
    g_form.hideRelatedList('sc_request');
  } else if(newValue == 'show') {
    g_form.showRelatedList('sc_request');
  } else if(newValue == 'hide all'){
    g_form.hideRelatedLists();
  } else if(newValue == 'show all'){
    g_form.showRelatedLists();
  }
}
```

## Desktop hideRelatedLists

Hides all related lists on the form

```js
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || newValue === '') {
    return;
  }
  if(newValue == 'hide'){
    g_form.hideRelatedList('sc_request');
  } else if(newValue == 'show') {
    g_form.showRelatedList('sc_request');
  } else if(newValue == 'hide all'){
    g_form.hideRelatedLists();
  } else if(newValue == 'show all'){
    g_form.showRelatedLists();
  }
}
```

## Desktop isLiveUpdating

## Desktop isMandatory

Returns true while a live update is being done on the record the form is
showing.

This can be used in an onChange() client script to determine if a change
to the record is because of a live update from another session. The
client script can then decide what action to take, or not to take. This
applies to systems using UI16 with live forms enabled.

```js
  g_form.isLiveUpdating();
```

## Desktop isNewRecord

Returns true if the record has never been saved Returns false if the
record has been saved

```js
g_form.isNewRecord();
```

## Desktop isSectionVisible

Returns true if the section is visible Returns false if the section is
not visible or does not exist. This method is available starting with
the Fuji release

```js
g_form.isSectionVisible('patching');
```

## Desktop refreshSlushbucket

You can update a list collector variable.

```js
g_form.refreshSlushbucket('bucket');
```

## Desktop removeDecoration

Removes the icon from the specified field that matches the icon and
title. Note: This method is not supported by Service Catalog.

```js
  g_form.removeDecoration('caller_id','fa-star','VIP');
```

## Desktop removeOption

Removes a specific option from a choice list

```js
g_form.removeOption('priority','1');
```

## Desktop save

Saves the record without navigating away from the record (update and
stay)

```js
g_form.save();
```

## Desktop setDisabled

Grays out field and makes it unavailable

```js
  var bool = true;
  g_form.setDisabled('caller_id', true);
```

## Desktop setDisplay

Displays the field if true. Hides the field if false. This method cannot
hide mandatory fields with no value. If the field is hidden, the space
is used to display other items

```js
  var bool = true;
  g_form.setDisplay('caller_id', true);
```

## Desktop setLabelOf

Sets the plain text value of the field label. This method is available
starting with the Fuji release

```js
if (g_user.hasRole('itil')) {
  var oldLabel = g_form.getLabelOf('comments');
  g_form.setLabelOf('comments', oldLabel + ' (Customer visible)');
}
```

## Desktop setMandatory

Makes the field required if true. Makes the field optional if false.
Best Practice: Use UI Policy rather than this method whenever possible

```js
g_form.setMandatory('quantity',true);// changes field to required or not
```

## Desktop setReadOnly

Makes the field read-only if true Makes the field editable if false.
Note: Both setReadOnly and setReadonly are functional. Best Practice:
Use UI Policy rather than this method whenever possible

```js
g_form.setValue('milestone', milestone);
g_form.setReadonly('end_date', milestone);
g_form.setReadonly('duration', milestone);
```

## Desktop setSectionDisplay

Shows or hides a section Works in both tab and flat modes. This method
is available starting with the Fuji release

```js
function onChange(control, oldValue, newValue, isLoading) {
   //this example was run on a form divided into sections (Change form)
   // and hid a section when the "state" field was changed
   var sections = g_form.getSections();
   if (newValue == '2') {
      g_form.setSectionDisplay(sections[1], false);
   } else {
      g_form.setSectionDisplay(sections[1], true);
   }
}
```

## Desktop setValue

Sets the value and the display value of a field Will display value if
there is no displayValue

```js
g_form.setValue('quantity','10');// sets the value to 10
```

## Desktop setVisible

Displays the field if true. Hides the field if false. If the field is
hidden, the space is left blank. This method cannot hide mandatory
fields with no value

```js
function onLoad() {
  g_form.setVisible('u_environment', false);
}
```

## Desktop showErrorBox

Displays an error message under the specified form field (either a
control object or the name of the field). If the control or field is
currently scrolled off the screen, it will be scrolled to. A global
property (glide.ui.scroll\_to\_message\_field) is available that
controls automatic message scrolling when the form field is offscreen
(scrolls the form to the control or field). The showFieldMsg() method is
a similar method that requires a 'type' parameter

```js
var scroll = true;
g_form.showErrorBox('caller_id','message',scroll)
```

## Desktop showFieldMsg

Displays either an informational or error message under the specified
form field (either a control object or the name of the field). Type may
be either 'info' or 'error.' If the control or field is currently
scrolled off the screen, it will be scrolled to. A global property
(glide.ui.scroll\_to\_message\_field) is available that controls
automatic message scrolling when the form field is offscreen (scrolls
the form to the control or field)

```js
 // parameters are;
 // field, string, info||error, scrollToField
 g_form.showFieldMsg('stage', 'text info', 'info', false);
 g_form.showFieldMsg('stage', 'text erro', 'error', false);
```

## Desktop showRelatedList

Displays the specified related list on the form

```js
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || newValue === '') {
    return;
  }
  if(newValue == 'hide'){
    g_form.hideRelatedList('sc_request');
  } else if(newValue == 'show') {
    g_form.showRelatedList('sc_request');
  } else if(newValue == 'hide all'){
    g_form.hideRelatedLists();
  } else if(newValue == 'show all'){
    g_form.showRelatedLists();
  }
}
```

## Desktop showRelatedLists

Displays all related lists on the form

```js
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || newValue === '') {
    return;
  }
  if(newValue == 'hide'){
    g_form.hideRelatedList('sc_request');
  } else if(newValue == 'show') {
    g_form.showRelatedList('sc_request');
  } else if(newValue == 'hide all'){
    g_form.hideRelatedLists();
  } else if(newValue == 'show all'){
    g_form.showRelatedLists();
  }
}
```

## Desktop submit

Saves the record User will be taken away from the form, returning them
to where they were previously

```js
g_form.submit();
```

### Desktop Undocumented

## Desktop activateTab

## Desktop addAttribute

## Desktop addGlideUIElement

```js
g_form.addGlideUIElement(glideUIElement);
```

## Desktop addNameMapEntry

```js
g_form.addNameMapEntry(nameElement);
```

## Desktop addSecurityReadOnlyFields

## Desktop addToCart

This seems to be referenced by an error when using `g_form.submit()`
from a catalog in a catalog client script.

## Desktop addValidator

```js
g_form.addValidator(fld.id, validator.validate);
```

## Desktop 

```js
g_form.addWarningMessage('Warning! Please click "Update Application" above to update the application.&nbsp;<b>Otherwise some new features may be missing if the application is not updated.</b>');
```

## Desktop allChangedFieldsFilter

## Desktop changedFieldsFilter

## Desktop changeElementParent

## Desktop changeElementStyle

## Desktop disable

## Desktop enable

## Desktop enableOption

## Desktop enableUIPolicyFields

## Desktop fieldChanged

## Desktop findV2RelatedListName

## Desktop getAction

## Desktop getControlByForm

```js
g_form.getControlByForm('table').options;
```

## Desktop getDerivedFields

## Desktop getDisplayBox

```js
 g_form.getDisplayBox('caller_id'); // returns html element for input
 g_form.getDisplayBox('caller_id').value; // returns html element attribute value
```

## Desktop getDisplayValue

```js
 g_form.getDisplayValue();//returns record displayvalue, not field displayvalue
 g_form.getDispalyValue('caller_id');//returns record displayvalue, not field displayvalue
```

## Desktop getEditableFields

If the form is read only, just return.

```js
var editableFields = g_form.getEditableFields();
if (editableFields.indexOf("report_title") < 0) {
  console.log('editable fields contains report_title');
}
```

## Desktop getGlideUIElement

```js
 var serverURLElement = g_form.getGlideUIElement('server_url');
```

## Desktop getLabel

```js
var label = g_form.getLabel('comments') + ' (' + getMessage('Customer visible') + ')';
g_form.setLabel('comments', label);
```

## Desktop getMissingFields

```js
 g_form.getMissingFields();
```

## Desktop getNiBox

## Desktop getOptionControl

We can access the option control to get the name of the operation.

```js
var optionControl = g_form.getOptionControl('operation');
var operationText;
if (optionControl) {
  var option = g_form.getOption('operation', g_form.getOptionControl('operation').value);
  operationText = option.text;
}
```

## Desktop orderNow

This seems to be referenced by an error when using `g_form.submit()`
from a catalog in a catalog client script.

## Desktop getParameter

```js
var tblName = g_form.getTableName();
var fromRelList = g_form.getParameter('sysparm_from_related_list');
var _module = g_form.getParameter('sysparm_userpref_module');
var listQuery = g_form.getParameter('sysparm_record_list');
var stackName = g_form.getParameter('sysparm_nameofstack');
var gotoUrl = g_form.getParameter('sysparm_goto_url');
var deleteUrl = g_form.getParameter('sysparm_referring_url');
var returnUrl = deleteUrl ? deleteUrl : returnUrl;
```

## Desktop getPrefixHandler

```js
var handler = g_form.getPrefixHandler(fieldName);
handler.getObject().setReadOnly(handler.getFieldName(), show)
```

## Desktop getRelatedListNames

## Desktop getScope

## Desktop getTabNameForField

## Desktop getTitle

## Desktop getViewName

```js
if(g_form.getViewName() === "business_case_view"){
  g_form.setDisplay("state", false);
}
```

## Desktop hasAttribute

## Desktop hasField

```js
if(g_form.hasField('schedule'))
  schedule = g_form.getValue('schedule');
}
```

## Desktop hasFieldMsgs

## Desktop isDatabaseView

## Desktop isDisabled

If the user can't set the field, we shouldn't touch it.

```js
if (g_form.isDisabled('element'))
  return;
```

## Desktop isDisplayNone

## Desktop isEditableField

## Desktop isInteger

## Desktop isNumeric

## Desktop isReadOnly

```js
var taskTableCtrl = g_form.getControl("task_table");
if (!taskTableCtrl || g_form.isReadOnly(taskTableEle, taskTableCtrl))
  return;
```

## Desktop isTemplateCompatible

## Desktop isUserPersonalizedField

## Desktop isVisible

```js
 if(serverURLElement && serverURLControl && g_form.isVisible(serverURLElement, serverURLControl)) {
   var urlajax = new GlideAjax('LDAPURLClientUtils');
 }
```

## Desktop mandatoryCheck

If we have unfilled mandatory fields then do not progress.

```js
if (!g_form.mandatoryCheck()) {
  return;
}
```

## Desktop onSubmit

## Desktop registerHandler

```js
if(fieldName != null && fieldName !== undefined)
  g_form.registerHandler(fieldName, filterObj);
```

## Desktop registerPrefixHandler

## Desktop removeAllDecorations

## Desktop removeContextItem

## Desktop removeCurrentPrefix

## Desktop removeItem

## Desktop resetPersonalizeHiddenFields

## Desktop resolveLabelNameMap

```js
id = id.startsWith('IO:') ? id : 'IO:' + id;
return g_form.resolveLabelNameMap(id);
```

## Desktop resolveNameMap

```js
var locElementId = "sys_display." + g_form.resolveNameMap(fieldMappings.location);
```

## Desktop resolvePrettyNameMap

## Desktop serialize

```js
ajax.addParam("sysparm_sys_id", g_form.getUniqueValue());
ajax.addParam("sysparm_form_fields", g_form.serialize());
ajax.addParam("sysparm_test_from_form", "true");
```

## Desktop serializeChanged

```js
dd.setPreference('sysparm_notification_id', sysId);
dd.setPreference('sysparm_changed_fields',g_form.serializeChangedAll());
dd.render();
```

## Desktop serializeChangedAll

```js
dd.setPreference('sysparm_notification_id', sysId);
dd.setPreference('sysparm_changed_fields',g_form.serializeChangedAll());
dd.render();
```

## Desktop serializeTargetFields

## Desktop setAction

## Desktop setDisabledControl

## Desktop setLiveUpdating

## Desktop setMandatoryOnlyIfModified

## Desktop setReadonly

```js
g_form.setValue('milestone', milestone);
g_form.setReadonly('end_date', milestone);
g_form.setReadonly('duration', milestone);
```

## Desktop setRequiredChecked

## Desktop setScope

## Desktop setSensitiveDisplayValue

## Desktop setStreamJournalFieldsDisplay

```js
if(g_form.setStreamJournalFieldsDisplay)
        g_form.setStreamJournalFieldsDisplay(false);
```

## Desktop setTemplateValue

```js
if (window.g_form) {
  g_form.setTemplateValue("template", "");
}
```

## Desktop setUserDisplay

## Desktop setValidation

```js
 g_form.setValidation("after", false);
```

## Desktop setVariablesReadOnly

```js
g_form.setVariablesReadOnly(true);
```

## Desktop validate
