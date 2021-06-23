---
id: jelly
title: Jelly 
---



With Jelly, logic can be embedded within static content and computed values may be inserted into the static content. Attention: This functionality requires a knowledge of Apache Jelly (a Java and XML based scripting and processing engine for turning XML into executable code).

This page from Apache has a summary of the standard Jelly tags: http://commons.apache.org/jelly/tags.html

# Escaping


Escaping is hell with Jelly and XML. Anything you'd think about escaping
is probably wrong. Here's the short of it.

## Characters

|     Desired Character     | Phase 1     | Phase 2     |
|:-------------------------:|-------------|-------------|
|            `&`            | `${AMP}`    | `$[AMP]`    |
|            `<`            | `${AMP}lt;` | `$[AMP]lt;` |
|            `>`            | `${AMP}gt;` | `$[AMP]gt;` |
|            ` `            | `${SP}`     | `$[SP]`     |

## Values

```xml
${test.getHTMLValue()}
${JS:expression}
${HTML:expression}
```

Sometimes you need to call `<g:no_escape>${jvar_t}</g:no_escape>`.

# Phases


Usually, there are two phases indicated by namespaces `<j>` versus `<j2>` and `<g>` versus `<g2>`.

The namespaces without the "2" happen in the first phase of processing and these are cached except when used in a UI page. Those with the "2" are never cached. Care must be taken when selecting whether to use phase 1 or phase 2 for efficiency and correct results.

In addition to the namespaces, the syntax used to insert values into static content differs depending on which phase is to supply the value. A dollar with braces surrounding a value inserts the value in phase 
1. For example, `${jvar_ref}` inserts the value jvar_ref during phase 1 of the jelly process. A dollar with brackets surrounding a value inserts the value in phase 
2. For example, `$[jvar_ref]` inserts the value jvar_ref during phase 2. A value surrounded by quotes is treated as a string. For example, `[jvar_ref]` inserts the value `jvar_ref` as a string during phase 2.

```html
 <script>
if (confirm("$[gs.getMessage('home.delete.confirm') ]"))
   ...
</script>
```

```html
<input type="hidden" id="${jvar_name}" name="${jvar_name}" value="${jvar_value}" class="${jvar_class}" />
```

# Tags

Here's a list of tags I generally use when working with Jelly. There are
other tags, but I find my use of them the exception, not the rule.

## Set

```xml
<j:set var="jvar_element_id" value="I have value!"/>
<label id="label">${jvar_element_id}</label>
```

## If

```xml
<j:if test="${jvar_something}">...do something...</j:if>
<j:if test="${!jvar_something}">...do something...</j:if>
```

## ${empty()}

```xml
<j:if test="${empty(jvar_something)}">
    Only shows if jvar_something is empty!
</j:if>
```

## Set If

```xml
<g2:set_if var="jvar_style"
test="$[gs.getPreference('table.compact') != 'false']"
true="margin-top:0px; margin-bottom:0px;"
false="margin-top:2px; margin-bottom:2px;" />
```

## Insert

`<g:insert>`, inserts a jelly file into your jelly in a new context,
meaning **you can not access** variables previously established in your
Jelly.

```xml
<g:insert template="get_target_form_function.xml" />
```

## Inline

`<g:inline>`, inserts a jelly file into your jelly in the same context,
meaning **you can acccess** variables previously established in your
Jelly.

```xml
<g:inline template="element_default.xml" />
```

## Call

`<g:call>`, has better encapulation than the above two. In short, you
can pass values, but **you can't access variables** previously
established in your Jelly unless explicitly passed.

```xml
<g:call function="collapsing_image.xml"
        id="${jvar_section_id}"
        image="$[jvar_cimg]"
        first_section_id="${jvar_first_section_id}"
        image_alt="${jvar_cimg_alt}"/>
```

## Evaluate

`<g:evaluate>` tag is used to evaluate an expression in [Rhino
Javascript](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/Rhino).
The last statement in the expression is the value the variable will
contain. If you would like to have the evaluate return an object (for
example an array), use the argument object="true".

```xml
<g2:evaluate var="jvar_page" jelly="true" object="true">
     var users = [];
     var sys_user = new GlideRecord("sys_user");
     sys_user.addQuery("active", "true");
     sys_user.query();
     while (sys_user.next()) {
        users.push(sys_user.getValue("name"));
     }
     users;
</g2:evaluate>
<g2:evaluate var="not_important" expression="sc_req_item.popCurrent()"/>
```