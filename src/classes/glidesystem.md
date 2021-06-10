---
id: glidesystem
title: GlideSystem
---
box a few places. This expects a number for the quantity of milleseconds
to delay the server processing.

```js
var timeInMS = 1000;//1 second in milleseconds
gs.sleep(timeInMs);
```

## suppressTextIndex

This is undocumented and found a few places, one of which is the UI Page
`service_preview_generator`.

```xml
<?xml version="1.0" encoding="utf-8" ?>
<j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide" xmlns:j2="null" xmlns:g2="null">
   <g:evaluate var="jvar_new_staged_id" jelly="true">
      var oldStagedGR = new GlideRecord("sc_ic_item_staging");
      var newStagedID = "";
      if (oldStagedGR.get(jelly.sysparm_staged_item)) {
         var updateSynchWasSuppressed = gs.suppressUpdateSynch(true);
         var textIndexWasSuppressed = gs.suppressTextIndex(true);
         try {
            newStagedID = copyDraftService(jelly.sysparm_staged_item, oldStagedGR.name);
            var newStagedGR = new GlideRecord("sc_ic_item_staging");
            newStagedGR.get(newStagedID);
            sc_ic_Factory.wrap(newStagedGR).publish();
         } catch(e) {
         } finally {
            gs.suppressUpdateSynch(updateSynchWasSuppressed);
            gs.suppressTextIndex(textIndexWasSuppressed);
         }
      }
      newStagedID;
   </g:evaluate>

   <j:if test="${newStagedID != ''}">
      <script>
         document.location.href = "service_preview.do?sysparm_id=${jvar_new_staged_id}${AMP}sysparm_preview=true";
      </script>
   </j:if>
</j:jelly>
```

## suppressUpdateSynch

This is undocumented and found a few places, one of which is the UI
Action called, "Preview Service".

```js
var newServiceID = '';
var wasSuppressed = gs.suppressUpdateSynch(true);
try {
   var newServiceID = copyDraftService(current.getUniqueValue(), current.name);
   var newServiceGR = new GlideRecord("sc_ic_item_staging");
   newServiceGR.get(newServiceID);
   sc_ic_Factory.wrap(newServiceGR).publish();
} catch(e) {
} finally {
   gs.suppressUpdateSynch(wasSuppressed);
}
if (newServiceID != '')
   action.setRedirectURL("service_preview.do?sysparm_id=" + newServiceID + "&sysparm_preview=true&sysparm_staged_image_id=" + current.getUniqueValue());
```

## tableExists

Determines if a database table exists.

```js
gs.tableExists('live_group_profile');
// true if table exists, otherwise false.
```

## templateOrMacroExists

This is undocumented and found on the `catalog_item` UI Macro;

```xml
<g2:evaluate var="jvar_exists">
    var templateName ='com.glideapp.servicecatalog_' +
    sc_cat_item.sys_class_name + '.xml';
    gs.templateOrMacroExists(templateName);
</g2:evaluate>
```

## unloadChoices

This is not documented and found on the `Choices unload` business rule
for Table `[sys_choice]`. I believe this is what adds all choices to an
update set when the `sys_choice` gets modified. It's just a guess.

```js
gs.unloadChoices(current.name, current.element, 'true');
```

## unWrap

This is not documented and found on the `assesment_redirect` UI Page.
Below I've listed the HTML and client script.

```xml
<?xml version="1.0" encoding="utf-8" ?>
<j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide" xmlns:j2="null" xmlns:g2="null">
  <g2:evaluate var="jvar_unwrapped_url" jelly="true">
    var url = jelly.sysparm_survey_url;
    url = gs.unWrap(url);
    url;
  </g2:evaluate>
  ${gs.getMessage("Redirecting to your survey")}...
</j:jelly>
```

```js
document.location.href = "$[JS:jvar_unwrapped_url]";
```

## updateSave

```js
gs.updateSave(current);
```

## urlDecode

This doesn't seem to work. I tried the following script and it just sets
the variable to undefined. Below is what the docs say about this;

> Replaces UTF-8 encoded characters with ASCII characters.

```js
var decoded = gs.urlDecode('https://dev32369.service-now.com/nav_to.do?uri=%2Fsys.scripts.do');
gs.print(decoded);
// *** Script: undefined
```

## urlEncode

This doesn't seem to work. I tried the following script and it just sets
the variable to undefined. Below is what the docs say about this;

> Encodes non-ASCII characters, unsafe ASCII characters, and spaces so
> the returned string can be used on the Internet. Uses UTF-8 encoding.
> Uses percent (%) encoding.

```js
var encoded = gs.urlEncode('https://dev32369.service-now.com/nav_to.do?uri=%2Fsys.scripts.do');
gs.print(encoded);
// *** Script: undefined
```

## userID

This returns the logged in user's `sys_id`.

```js
var userID = gs.userID();
gs.print(userID);
// *** Script: d7004dd20f021300fc69cdbce1050eff
```

## user\_id

```js
var userID = gs.user_id();
gs.print(userID);
// *** Script: d7004dd20f021300fc69cdbce1050eff
```

## warn

This method was added around the time scoped apps were added as
`gs.print` was made unavailable. In anycase, this is just a level of
logging.

```js
gs.warn('This is a message with {0}, {1}, {2}, {3}, {4} parameters','one','two','three','four', 'five');
//*** Script: This is a message with one, two, three, four, five parameters
```

## workflowFlush

## xmlToJSON

Takes an XML string and returns a JSON object. This seems to be similar
to the
[XMLHelper](https://docs.servicenow.com/bundle/kingston-application-development/page/script/server-scripting/concept/c_XMLHelper.html)
script include function, `toObject`.

```js
var xmlStr = "";
xmlStr += "<Names>";
xmlStr += "  <Name>";
xmlStr += "    <FirstName>John</FirstName>";
xmlStr += "    <LastName>Smith</LastName>";
xmlStr += "  </Name>";
xmlStr += "  <Name>";
xmlStr += "    <FirstName>James</FirstName>";
xmlStr += "    <LastName>White</LastName>";
xmlStr += "  </Name>";
xmlStr += "</Names>";

var xmlObj = gs.xmlToJSON(xmlStr);
gs.info(JSON.stringify(xmlObj,'','  '));
/*** Script: {
  "Names": {
    "Name": [
      {
        "FirstName": "John",
        "LastName": "Smith"
      },
      {
        "FirstName": "James",
        "LastName": "White"
      }
    ]
  }
}*/
```
