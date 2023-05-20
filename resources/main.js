$( function () {
	// sidebar-chunk only applies to desktop-small, but the toggles are hidden at
	// other resolutions regardless and the css overrides any visible effects.
	var $dropdowns = $( '#p-variants-desktop, .sidebar-chunk' );
	// var $dropdowns = $( '#personal, #p-variants-desktop, .sidebar-chunk' );

	/**
	 * Desktop menu click-toggling
	 *
	 * We're not even checking if it's desktop because the classes in play have no effect
	 * on mobile regardless... this may break things at some point, though.
	 */

	/**
	 * Close all dropdowns
	 */
	function closeOpen() {
		$dropdowns.removeClass( 'dropdown-active' );
	}

	/**
	 * Click behaviour
	 */
	$dropdowns.on( 'click', function ( e ) {
		// Check if it's already open so we don't open it again
		// eslint-disable-next-line no-jquery/no-class-state
		if ( $( this ).hasClass( 'dropdown-active' ) ) {
			if ( $( e.target ).closest( $( 'h2, #p-variants-desktop h3' ) ).length > 0 ) {
				// treat reclick on the header as a toggle
				closeOpen();
			}
			// Clicked inside an open menu; don't do anything
		} else {
			closeOpen();
			e.stopPropagation(); // stop hiding it!
			$( this ).addClass( 'dropdown-active' );
		}
	} );
	$( document ).on( 'click', function ( e ) {
		if ( $( e.target ).closest( $dropdowns ).length > 0 ) {
			// Clicked inside an open menu; don't close anything
		} else {
			closeOpen();
		}
	} );
} );

mw.hook( 'wikipage.content' ).add( function ( $content ) {
	// Gotta wrap them for this to work; maybe later the parser etc will do this for us?!
	$content.find( 'div > table:not( table table )' ).wrap( '<div class="content-table-wrapper"><div class="content-table"></div></div>' );
	$content.find( '.content-table-wrapper' ).prepend( '<div class="content-table-left"></div><div class="content-table-right"></div>' );

	/**
	 * Set up borders for experimental overflowing table scrolling
	 *
	 * I have no idea what I'm doing.
	 *
	 * @param {jQuery} $table
	 */
	function setScrollClass( $table ) {
		var $tableWrapper = $table.parent(),
			$wrapper = $tableWrapper.parent(),
			// wtf browser rtl implementations
			scroll = Math.abs( $tableWrapper.scrollLeft() );

		// 1 instead of 0 because of weird rtl rounding errors or something
		if ( scroll > 1 ) {
			$wrapper.addClass( 'scroll-left' );
		} else {
			$wrapper.removeClass( 'scroll-left' );
		}

		if ( $table.outerWidth() - $tableWrapper.innerWidth() - scroll > 1 ) {
			$wrapper.addClass( 'scroll-right' );
		} else {
			$wrapper.removeClass( 'scroll-right' );
		}
	}

	$content.find( '.content-table' ).on( 'scroll', function () {
		setScrollClass( $( this ).children( 'table' ).first() );

		if ( $content.attr( 'dir' ) === 'rtl' ) {
			$( this ).find( 'caption' ).css( 'margin-right', Math.abs( $( this ).scrollLeft() ) + 'px' );
		} else {
			$( this ).find( 'caption' ).css( 'margin-left', $( this ).scrollLeft() + 'px' );
		}
	} );

	/**
	 * Mark overflowed tables for scrolling
	 */
	function unOverflowTables() {
		$content.find( '.content-table > table' ).each( function () {
			var $table = $( this ),
				$wrapper = $table.parent().parent();
			if ( $table.outerWidth() > $wrapper.outerWidth() ) {
				$wrapper.addClass( 'overflowed' );
				setScrollClass( $table );
			} else {
				$wrapper.removeClass( 'overflowed scroll-left scroll-right fixed-scrollbar-container' );
			}
		} );

		// Set up sticky captions
		$content.find( '.content-table > table > caption' ).each( function () {
			var $container, tableHeight,
				$table = $( this ).parent(),
				$wrapper = $table.parent().parent();

			if ( $table.outerWidth() > $wrapper.outerWidth() ) {
				$container = $( this ).parents( '.content-table-wrapper' );
				$( this ).width( $content.width() );
				tableHeight = $container.innerHeight() - $( this ).outerHeight();

				$container.find( '.content-table-left' ).height( tableHeight );
				$container.find( '.content-table-right' ).height( tableHeight );
			}
		} );
	}

	unOverflowTables();
	$( window ).on( 'resize', unOverflowTables );

	/**
	 * Sticky scrollbars maybe?!
	 */
	$content.find( '.content-table' ).each( function () {
		var $table, $tableWrapper, $spoof, $scrollbar;

		$tableWrapper = $( this );
		$table = $tableWrapper.children( 'table' ).first();

		// Assemble our silly crap and add to page
		$scrollbar = $( '<div>' ).addClass( 'content-table-scrollbar inactive' ).width( $content.width() );
		$spoof = $( '<div>' ).addClass( 'content-table-spoof' ).width( $table.outerWidth() );
		$tableWrapper.parent().prepend( $scrollbar.prepend( $spoof ) );
	} );

	/**
	 * Scoll table when scrolling scrollbar and visa-versa lololol wut
	 */
	$content.find( '.content-table' ).on( 'scroll', function () {
		// Only do this here if we're not already mirroring the spoof
		var $mirror = $( this ).siblings( '.inactive' ).first();

		$mirror.scrollLeft( $( this ).scrollLeft() );
	} );
	$content.find( '.content-table-scrollbar' ).on( 'scroll', function () {
		var $mirror = $( this ).siblings( '.content-table' ).first();

		// Only do this here if we're not already mirroring the table
		// eslint-disable-next-line no-jquery/no-class-state
		if ( !$( this ).hasClass( 'inactive' ) ) {
			$mirror.scrollLeft( $( this ).scrollLeft() );
		}
	} );

	/**
	 * Set active when actually over the table it applies to...
	 */
	function determineActiveSpoofScrollbars() {
		$content.find( '.overflowed .content-table' ).each( function () {
			var $scrollbar = $( this ).siblings( '.content-table-scrollbar' ).first(),
				tableTop, tableBottom, viewBottom, captionHeight;

			// Skip caption
			captionHeight = $( this ).find( 'caption' ).outerHeight();

			if ( !captionHeight ) {
				captionHeight = 0;
			} else {
				// Pad slightly for reasons
				captionHeight += 8;
			}

			tableTop = $( this ).offset().top;
			tableBottom = tableTop + $( this ).outerHeight();
			viewBottom = window.scrollY + document.documentElement.clientHeight;

			if ( tableTop + captionHeight < viewBottom && tableBottom > viewBottom ) {
				$scrollbar.removeClass( 'inactive' );
			} else {
				$scrollbar.addClass( 'inactive' );
			}
		} );
	}

	determineActiveSpoofScrollbars();
	$( window ).on( 'scroll resize', determineActiveSpoofScrollbars );

	/**
	 * Make sure tablespoofs remain correctly-sized?
	 */
	$( window ).on( 'resize', function () {
		$content.find( '.content-table-scrollbar' ).each( function () {
			var width = $( this ).siblings().first().find( 'table' ).first().width();
			$( this ).find( '.content-table-spoof' ).first().width( width );
			$( this ).width( $content.width() );
		} );
	} );
} );

/** 头像下拉延迟 */
$( function () {
	var hoverTimer, outTimer;
	$( '#personal' ).hover( function () {
		clearTimeout( outTimer );
		hoverTimer = window.setTimeout( function () {
			$( '#personal' ).addClass( 'dropdown-active' );
		}, 100 );
	}, function () {
		clearTimeout( hoverTimer );
		outTimer = window.setTimeout( function () {
			$( '#personal' ).removeClass( 'dropdown-active' );
		}, 300 );
	} );
} );

/** MDUI */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).mdui=e()}(this,(function(){"use strict";function t(t){var e=this.constructor;return this.then((function(n){return e.resolve(t()).then((function(){return n}))}),(function(n){return e.resolve(t()).then((function(){return e.reject(n)}))}))}function e(t){return new this((function(e,n){if(!t||void 0===t.length)return n(new TypeError(typeof t+" "+t+" is not iterable(cannot read property Symbol(Symbol.iterator))"));var i=Array.prototype.slice.call(t);if(0===i.length)return e([]);var r=i.length;function o(t,n){if(n&&("object"==typeof n||"function"==typeof n)){var s=n.then;if("function"==typeof s)return void s.call(n,(function(e){o(t,e)}),(function(n){i[t]={status:"rejected",reason:n},0==--r&&e(i)}))}i[t]={status:"fulfilled",value:n},0==--r&&e(i)}for(var s=0;s<i.length;s++)o(s,i[s])}))}!function(){try{return new MouseEvent("test")}catch(t){}var t=function(t,e){e=e||{bubbles:!1,cancelable:!1};var n=document.createEvent("MouseEvent");return n.initMouseEvent(t,e.bubbles,e.cancelable,window,0,e.screenX||0,e.screenY||0,e.clientX||0,e.clientY||0,e.ctrlKey||!1,e.altKey||!1,e.shiftKey||!1,e.metaKey||!1,e.button||0,e.relatedTarget||null),n};t.prototype=Event.prototype,window.MouseEvent=t}(),function(){function t(t,e){e=e||{bubbles:!1,cancelable:!1,detail:void 0};var n=document.createEvent("CustomEvent");return n.initCustomEvent(t,e.bubbles,e.cancelable,e.detail),n}"function"!=typeof window.CustomEvent&&(t.prototype=window.Event.prototype,window.CustomEvent=t)}();var n=setTimeout;function i(t){return Boolean(t&&void 0!==t.length)}function r(){}function o(t){if(!(this instanceof o))throw new TypeError("Promises must be constructed via new");if("function"!=typeof t)throw new TypeError("not a function");this._state=0,this._handled=!1,this._value=void 0,this._deferreds=[],f(t,this)}function s(t,e){for(;3===t._state;)t=t._value;0!==t._state?(t._handled=!0,o._immediateFn((function(){var n=1===t._state?e.onFulfilled:e.onRejected;if(null!==n){var i;try{i=n(t._value)}catch(t){return void u(e.promise,t)}a(e.promise,i)}else(1===t._state?a:u)(e.promise,t._value)}))):t._deferreds.push(e)}function a(t,e){try{if(e===t)throw new TypeError("A promise cannot be resolved with itself.");if(e&&("object"==typeof e||"function"==typeof e)){var n=e.then;if(e instanceof o)return t._state=3,t._value=e,void c(t);if("function"==typeof n)return void f((i=n,r=e,function(){i.apply(r,arguments)}),t)}t._state=1,t._value=e,c(t)}catch(e){u(t,e)}var i,r}function u(t,e){t._state=2,t._value=e,c(t)}function c(t){2===t._state&&0===t._deferreds.length&&o._immediateFn((function(){t._handled||o._unhandledRejectionFn(t._value)}));for(var e=0,n=t._deferreds.length;e<n;e++)s(t,t._deferreds[e]);t._deferreds=null}function l(t,e,n){this.onFulfilled="function"==typeof t?t:null,this.onRejected="function"==typeof e?e:null,this.promise=n}function f(t,e){var n=!1;try{t((function(t){n||(n=!0,a(e,t))}),(function(t){n||(n=!0,u(e,t))}))}catch(t){if(n)return;n=!0,u(e,t)}}o.prototype.catch=function(t){return this.then(null,t)},o.prototype.then=function(t,e){var n=new this.constructor(r);return s(this,new l(t,e,n)),n},o.prototype.finally=t,o.all=function(t){return new o((function(e,n){if(!i(t))return n(new TypeError("Promise.all accepts an array"));var r=Array.prototype.slice.call(t);if(0===r.length)return e([]);var o=r.length;function s(t,i){try{if(i&&("object"==typeof i||"function"==typeof i)){var a=i.then;if("function"==typeof a)return void a.call(i,(function(e){s(t,e)}),n)}r[t]=i,0==--o&&e(r)}catch(t){n(t)}}for(var a=0;a<r.length;a++)s(a,r[a])}))},o.allSettled=e,o.resolve=function(t){return t&&"object"==typeof t&&t.constructor===o?t:new o((function(e){e(t)}))},o.reject=function(t){return new o((function(e,n){n(t)}))},o.race=function(t){return new o((function(e,n){if(!i(t))return n(new TypeError("Promise.race accepts an array"));for(var r=0,s=t.length;r<s;r++)o.resolve(t[r]).then(e,n)}))},o._immediateFn="function"==typeof setImmediate&&function(t){setImmediate(t)}||function(t){n(t,0)},o._unhandledRejectionFn=function(t){"undefined"!=typeof console&&console};var h=function(){if("undefined"!=typeof self)return self;if("undefined"!=typeof window)return window;if("undefined"!=typeof global)return global;throw new Error("unable to locate global object")}();function d(t){return"function"==typeof t}function p(t){return"string"==typeof t}function v(t){return"number"==typeof t}function m(t){return"boolean"==typeof t}function y(t){return void 0===t}function g(t){return null===t}function b(t){return t instanceof Window}function w(t){return t instanceof Document}function x(t){return t instanceof Element}function C(t){return!d(t)&&!b(t)&&v(t.length)}function E(t){return"object"==typeof t&&null!==t}function _(t){return w(t)?t.documentElement:t}function T(t){return t.replace(/^-ms-/,"ms-").replace(/-([a-z])/g,(function(t,e){return e.toUpperCase()}))}function k(t){return t.replace(/[A-Z]/g,(function(t){return"-"+t.toLowerCase()}))}function S(t,e){return window.getComputedStyle(t).getPropertyValue(k(e))}function O(t){return"border-box"===S(t,"box-sizing")}function j(t,e,n){var i="width"===e?["Left","Right"]:["Top","Bottom"];return[0,1].reduce((function(e,r,o){var s=n+i[o];return"border"===n&&(s+="Width"),e+parseFloat(S(t,s)||"0")}),0)}function A(t,e){if("width"===e||"height"===e){var n=t.getBoundingClientRect()[e];return O(t)?n+"px":n-j(t,e,"border")-j(t,e,"padding")+"px"}return S(t,e)}function R(t,e){var n=document.createElement(e);return n.innerHTML=t,[].slice.call(n.childNodes)}function $(){return!1}"function"!=typeof h.Promise?h.Promise=o:h.Promise.prototype.finally?h.Promise.allSettled||(h.Promise.allSettled=e):h.Promise.prototype.finally=t;var H=["animationIterationCount","columnCount","fillOpacity","flexGrow","flexShrink","fontWeight","gridArea","gridColumn","gridColumnEnd","gridColumnStart","gridRow","gridRowEnd","gridRowStart","lineHeight","opacity","order","orphans","widows","zIndex","zoom"];function M(t,e){if(C(t)){for(var n=0;n<t.length;n+=1)if(!1===e.call(t[n],n,t[n]))return t}else for(var i=Object.keys(t),r=0;r<i.length;r+=1)if(!1===e.call(t[i[r]],i[r],t[i[r]]))return t;return t}var I=function(t){var e=this;return this.length=0,t?(M(t,(function(t,n){e[t]=n})),this.length=t.length,this):this};var L=function(){var t=function(e){if(!e)return new I;if(e instanceof I)return e;if(d(e))return/complete|loaded|interactive/.test(document.readyState)&&document.body?e.call(document,t):document.addEventListener("DOMContentLoaded",(function(){return e.call(document,t)}),!1),new I([document]);if(p(e)){var n=e.trim();if("<"===n[0]&&">"===n[n.length-1]){var i="div";return M({li:"ul",tr:"tbody",td:"tr",th:"tr",tbody:"table",option:"select"},(function(t,e){if(0===n.indexOf("<"+t))return i=e,!1})),new I(R(n,i))}if(!("#"===e[0]&&!e.match(/[ .<>:~]/)))return new I(document.querySelectorAll(e));var r=document.getElementById(e.slice(1));return r?new I([r]):new I}return!C(e)||e instanceof Node?new I([e]):new I(e)};return t.fn=I.prototype,t}();setTimeout((function(){return L("body").addClass("mdui-loaded")}));var N={$:L};function F(t,e){return t!==e&&_(t).contains(e)}function P(t,e){return M(e,(function(e,n){t.push(n)})),t}L.fn.each=function(t){return M(this,t)},L.fn.get=function(t){return void 0===t?[].slice.call(this):this[t>=0?t:t+this.length]},L.fn.find=function(t){var e=[];return this.each((function(n,i){P(e,L(i.querySelectorAll(t)).get())})),new I(e)};var q={},D=1;function B(t){var e="_mduiEventId";return t[e]||(t[e]=++D),t[e]}function Y(t){var e=t.split(".");return{type:e[0],ns:e.slice(1).sort().join(" ")}}function W(t){return new RegExp("(?:^| )"+t.replace(" "," .* ?")+"(?: |$)")}function z(t,e,n,i){var r=q[B(t)]||[],o=function(e){delete r[e.id],t.removeEventListener(e.type,e.proxy,!1)};e?e.split(" ").forEach((function(e){e&&function(t,e,n,i){var r=Y(e);return(q[B(t)]||[]).filter((function(t){return t&&(!r.type||t.type===r.type)&&(!r.ns||W(r.ns).test(t.ns))&&(!n||B(t.func)===B(n))&&(!i||t.selector===i)}))}(t,e,n,i).forEach((function(t){return o(t)}))})):r.forEach((function(t){return o(t)}))}function U(t,e){for(var n=[],i=arguments.length-2;i-- >0;)n[i]=arguments[i+2];return n.unshift(e),M(n,(function(e,n){M(n,(function(e,n){y(n)||(t[e]=n)}))})),t}function X(t){if(!E(t)&&!Array.isArray(t))return"";var e=[];function n(t,i){var r;E(i)?M(i,(function(e,o){r=Array.isArray(i)&&!E(o)?"":e,n(t+"["+r+"]",o)})):(r=null==i||""===i?"=":"="+encodeURIComponent(i),e.push(encodeURIComponent(t)+r))}return Array.isArray(t)?M(t,(function(){n(this.name,this.value)})):M(t,n),e.join("&")}L.fn.trigger=function(t,e){var n,i=Y(t),r={bubbles:!0,cancelable:!0};return["click","mousedown","mouseup","mousemove"].indexOf(i.type)>-1?n=new MouseEvent(i.type,r):(r.detail=e,n=new CustomEvent(i.type,r)),n._detail=e,n._ns=i.ns,this.each((function(){this.dispatchEvent(n)}))};var J={},K={ajaxStart:"start.mdui.ajax",ajaxSuccess:"success.mdui.ajax",ajaxError:"error.mdui.ajax",ajaxComplete:"complete.mdui.ajax"};function G(t){return["GET","HEAD"].indexOf(t)>=0}function Q(t,e){return(t+"&"+e).replace(/[&?]{1,2}/,"?")}L.ajax=function(t){var e,n=!1,i={},r=function(t){var e={url:"",method:"GET",data:"",processData:!0,async:!0,cache:!0,username:"",password:"",headers:{},xhrFields:{},statusCode:{},dataType:"text",contentType:"application/x-www-form-urlencoded",timeout:0,global:!0};return M(J,(function(t,n){["beforeSend","success","error","complete","statusCode"].indexOf(t)<0&&!y(n)&&(e[t]=n)})),U({},e,t)}(t),o=r.url||window.location.toString(),s=r.method.toUpperCase(),a=r.data,u=r.processData,c=r.async,l=r.cache,f=r.username,h=r.password,d=r.headers,v=r.xhrFields,m=r.statusCode,g=r.dataType,b=r.contentType,w=r.timeout,x=r.global;function C(t,e,i){for(var o,s,a=[],u=arguments.length-3;u-- >0;)a[u]=arguments[u+3];x&&L(document).trigger(t,e),i&&(i in J&&(o=J[i].apply(J,a)),r[i]&&(s=r[i].apply(r,a)),"beforeSend"!==i||!1!==o&&!1!==s||(n=!0))}return!a||!G(s)&&!u||p(a)||a instanceof ArrayBuffer||a instanceof Blob||a instanceof Document||a instanceof FormData||(a=X(a)),a&&G(s)&&(o=Q(o,a),a=null),new Promise((function(t,u){G(s)&&!l&&(o=Q(o,"_="+Date.now()));var p,x=new XMLHttpRequest;x.open(s,o,c,f,h),(b||a&&!G(s)&&!1!==b)&&x.setRequestHeader("Content-Type",b),"json"===g&&x.setRequestHeader("Accept","application/json, text/javascript"),d&&M(d,(function(t,e){y(e)||x.setRequestHeader(t,e+"")})),/^([\w-]+:)?\/\/([^/]+)/.test(o)&&RegExp.$2!==window.location.host||x.setRequestHeader("X-Requested-With","XMLHttpRequest"),v&&M(v,(function(t,e){x[t]=e})),i.xhr=x,i.options=r,x.onload=function(){p&&clearTimeout(p);var n,r=x.status>=200&&x.status<300||304===x.status||0===x.status;if(r)if(e=204===x.status||"HEAD"===s?"nocontent":304===x.status?"notmodified":"success","json"===g){try{n="HEAD"===s?void 0:JSON.parse(x.responseText),i.data=n}catch(t){C(K.ajaxError,i,"error",x,e="parsererror"),u(new Error(e))}"parsererror"!==e&&(C(K.ajaxSuccess,i,"success",n,e,x),t(n))}else n="HEAD"===s?void 0:"text"===x.responseType||""===x.responseType?x.responseText:x.response,i.data=n,C(K.ajaxSuccess,i,"success",n,e,x),t(n);else C(K.ajaxError,i,"error",x,e="error"),u(new Error(e));M([J.statusCode,m],(function(t,i){i&&i[x.status]&&(r?i[x.status](n,e,x):i[x.status](x,e))})),C(K.ajaxComplete,i,"complete",x,e)},x.onerror=function(){p&&clearTimeout(p),C(K.ajaxError,i,"error",x,x.statusText),C(K.ajaxComplete,i,"complete",x,"error"),u(new Error(x.statusText))},x.onabort=function(){var t="abort";p&&(t="timeout",clearTimeout(p)),C(K.ajaxError,i,"error",x,t),C(K.ajaxComplete,i,"complete",x,t),u(new Error(t))},C(K.ajaxStart,i,"beforeSend",x),n?u(new Error("cancel")):(w>0&&(p=setTimeout((function(){x.abort()}),w)),x.send(a))}))},L.ajaxSetup=function(t){return U(J,t)},L.contains=F;var V="_mduiElementDataStorage";function Z(t,e){t[V]||(t[V]={}),M(e,(function(e,n){t[V][T(e)]=n}))}function tt(t,e,n){var i;return E(e)?(Z(t,e),e):y(n)?y(e)?t[V]?t[V]:{}:(e=T(e),t[V]&&e in t[V]?t[V][e]:void 0):(Z(t,((i={})[e]=n,i)),n)}function et(t,e){var n,i,r=[];return M(t,(function(t,n){null!=(i=e.call(window,n,t))&&r.push(i)})),(n=[]).concat.apply(n,r)}function nt(t,e){if(t[V]){var n=function(e){e=T(e),t[V][e]&&(t[V][e]=null,delete t[V][e])};y(e)?(t[V]=null,delete t[V]):p(e)?e.split(" ").filter((function(t){return t})).forEach((function(t){return n(t)})):M(e,(function(t,e){return n(e)}))}}function it(t){var e=[];return M(t,(function(t,n){-1===e.indexOf(n)&&e.push(n)})),e}function rt(t){return p(t)&&("<"!==t[0]||">"!==t[t.length-1])}function ot(t,e,n,i,r){var o,s=[];return t.each((function(t,a){for(o=a[n];o&&x(o);){if(2===e){if(i&&L(o).is(i))break;r&&!L(o).is(r)||s.push(o)}else{if(0===e){i&&!L(o).is(i)||s.push(o);break}i&&!L(o).is(i)||s.push(o)}o=o[n]}})),new I(it(s))}L.data=tt,L.each=M,L.extend=function(){for(var t=this,e=[],n=arguments.length;n--;)e[n]=arguments[n];return 1===e.length?(M(e[0],(function(e,n){t[e]=n})),this):U.apply(void 0,[e.shift(),e.shift()].concat(e))},L.map=et,L.merge=P,L.param=X,L.removeData=nt,L.unique=it,L.fn.add=function(t){return new I(it(P(this.get(),L(t).get())))},M(["add","remove","toggle"],(function(t,e){L.fn[e+"Class"]=function(t){return"remove"!==e||arguments.length?this.each((function(n,i){if(x(i)){var r=(d(t)?t.call(i,n,i.getAttribute("class")||""):t).split(" ").filter((function(t){return t}));M(r,(function(t,n){i.classList[e](n)}))}})):this.each((function(t,e){e.setAttribute("class","")}))}})),M(["insertBefore","insertAfter"],(function(t,e){L.fn[e]=function(e){var n=t?L(this.get().reverse()):this,i=L(e),r=[];return i.each((function(e,i){i.parentNode&&n.each((function(n,o){var s=e?o.cloneNode(!0):o,a=t?i.nextSibling:i;r.push(s),i.parentNode.insertBefore(s,a)}))})),L(t?r.reverse():r)}})),M(["before","after"],(function(t,e){L.fn[e]=function(){for(var e=[],n=arguments.length;n--;)e[n]=arguments[n];return 1===t&&(e=e.reverse()),this.each((function(n,i){M(d(e[0])?[e[0].call(i,n,i.innerHTML)]:e,(function(e,r){(rt(r)?L(R(r,"div")):n&&x(r)?L(r.cloneNode(!0)):L(r))[t?"insertAfter":"insertBefore"](i)}))}))}})),L.fn.off=function(t,e,n){var i=this;return E(t)?(M(t,(function(t,n){i.off(t,e,n)})),this):((!1===e||d(e))&&(n=e,e=void 0),!1===n&&(n=$),this.each((function(){z(this,t,n,e)})))},L.fn.on=function(t,e,n,i,r){var o=this;if(E(t))return p(e)||(n=n||e,e=void 0),M(t,(function(t,i){o.on(t,e,n,i,r)})),this;if(null==n&&null==i?(i=e,n=e=void 0):null==i&&(p(e)?(i=n,n=void 0):(i=n,n=e,e=void 0)),!1===i)i=$;else if(!i)return this;if(r){var s=this,a=i;i=function(t){return s.off(t.type,e,i),a.apply(this,arguments)}}return this.each((function(){!function(t,e,n,i,r){var o=B(t);q[o]||(q[o]=[]);var s=!1;E(i)&&i.useCapture&&(s=!0),e.split(" ").forEach((function(e){if(e){var a=Y(e),u={type:a.type,ns:a.ns,func:n,selector:r,id:q[o].length,proxy:l};q[o].push(u),t.addEventListener(u.type,l,s)}function c(t,e){!1===n.apply(e,void 0===t._detail?[t]:[t].concat(t._detail))&&(t.preventDefault(),t.stopPropagation())}function l(e){e._ns&&!W(e._ns).test(a.ns)||(e._data=i,r?L(t).find(r).get().reverse().forEach((function(t){(t===e.target||F(t,e.target))&&c(e,t)})):c(e,t))}}))}(this,t,i,n,e)}))},M(K,(function(t,e){L.fn[t]=function(t){return this.on(e,(function(e,n){t(e,n.xhr,n.options,n.data)}))}})),L.fn.map=function(t){return new I(et(this,(function(e,n){return t.call(e,n,e)})))},L.fn.clone=function(){return this.map((function(){return this.cloneNode(!0)}))},L.fn.is=function(t){var e=!1;if(d(t))return this.each((function(n,i){t.call(i,n,i)&&(e=!0)})),e;if(p(t))return this.each((function(n,i){w(i)||b(i)||(i.matches||i.msMatchesSelector).call(i,t)&&(e=!0)})),e;var n=L(t);return this.each((function(t,i){n.each((function(t,n){i===n&&(e=!0)}))})),e},L.fn.remove=function(t){return this.each((function(e,n){!n.parentNode||t&&!L(n).is(t)||n.parentNode.removeChild(n)}))},M(["prepend","append"],(function(t,e){L.fn[e]=function(){for(var e=[],n=arguments.length;n--;)e[n]=arguments[n];return this.each((function(n,i){var r,o=i.childNodes,s=o.length,a=s?o[t?s-1:0]:document.createElement("div");s||i.appendChild(a);var u=d(e[0])?[e[0].call(i,n,i.innerHTML)]:e;n&&(u=u.map((function(t){return p(t)?t:L(t).clone()}))),(r=L(a))[t?"after":"before"].apply(r,u),s||i.removeChild(a)}))}})),M(["appendTo","prependTo"],(function(t,e){L.fn[e]=function(e){var n=[],i=L(e).map((function(e,i){var r=i.childNodes,o=r.length;if(o)return r[t?0:o-1];var s=document.createElement("div");return i.appendChild(s),n.push(s),s})),r=this[t?"insertBefore":"insertAfter"](i);return L(n).remove(),r}})),M(["attr","prop","css"],(function(t,e){function n(e,n,i){if(!y(i))switch(t){case 0:g(i)?e.removeAttribute(n):e.setAttribute(n,i);break;case 1:e[n]=i;break;default:n=T(n),e.style[n]=v(i)?i+(H.indexOf(n)>-1?"":"px"):i;break}}function i(e,n){switch(t){case 0:var i=e.getAttribute(n);return g(i)?void 0:i;case 1:return e[n];default:return A(e,n)}}L.fn[e]=function(t,r){var o=this;if(E(t))return M(t,(function(t,n){o[e](t,n)})),this;if(1===arguments.length){var s=this[0];return x(s)?i(s,t):void 0}return this.each((function(e,o){n(o,t,d(r)?r.call(o,e,i(o,t)):r)}))}})),L.fn.children=function(t){var e=[];return this.each((function(n,i){M(i.childNodes,(function(n,i){x(i)&&(t&&!L(i).is(t)||e.push(i))}))})),new I(it(e))},L.fn.slice=function(){for(var t=[],e=arguments.length;e--;)t[e]=arguments[e];return new I([].slice.apply(this,t))},L.fn.eq=function(t){var e=-1===t?this.slice(t):this.slice(t,+t+1);return new I(e)},M(["","s","sUntil"],(function(t,e){L.fn["parent"+e]=function(e,n){return ot(t?L(this.get().reverse()):this,t,"parentNode",e,n)}})),L.fn.closest=function(t){if(this.is(t))return this;var e=[];return this.parents().each((function(n,i){if(L(i).is(t))return e.push(i),!1})),new I(e)};var st=/^(?:{[\w\W]*\}|\[[\w\W]*\])$/;function at(t,e,n){if(y(n)&&1===t.nodeType){var i="data-"+k(e);if(p(n=t.getAttribute(i)))try{n=function(t){return"true"===t||"false"!==t&&("null"===t?null:t===+t+""?+t:st.test(t)?JSON.parse(t):t)}(n)}catch(t){}else n=void 0}return n}function ut(t,e,n,i,r,o){var s=function(n){return j(t,e.toLowerCase(),n)*o};return 2===i&&r&&(n+=s("margin")),O(t)?(window.document.documentMode&&1===o&&(n+=s("border"),n+=s("padding")),0===i&&(n-=s("border")),1===i&&(n-=s("border"),n-=s("padding"))):(0===i&&(n+=s("padding")),2===i&&(n+=s("border"),n+=s("padding"))),n}function ct(t,e,n,i){var r="client"+e,o="scroll"+e,s="offset"+e,a="inner"+e;if(b(t))return 2===n?t[a]:_(document)[r];if(w(t)){var u=_(t);return Math.max(t.body[o],u[o],t.body[s],u[s],u[r])}var c=parseFloat(S(t,e.toLowerCase())||"0");return ut(t,e,c,n,i,1)}function lt(t,e,n,i,r,o){var s=d(o)?o.call(t,e,ct(t,n,i,r)):o;if(null!=s){var a=L(t),u=n.toLowerCase();if(["auto","inherit",""].indexOf(s)>-1)a.css(u,s);else{var c=s.toString().replace(/\b[0-9.]*/,"");s=ut(t,n,parseFloat(s),i,r,-1)+(c||"px"),a.css(u,s)}}}function ft(t,e){return parseFloat(t.css(e))}function ht(t){if(!t.getClientRects().length)return{top:0,left:0};var e=t.getBoundingClientRect(),n=t.ownerDocument.defaultView;return{top:e.top+n.pageYOffset,left:e.left+n.pageXOffset}}function dt(t,e,n){var i=L(t),r=i.css("position");"static"===r&&i.css("position","relative");var o,s,a=ht(t),u=i.css("top"),c=i.css("left");if(("absolute"===r||"fixed"===r)&&(u+c).indexOf("auto")>-1){var l=i.position();o=l.top,s=l.left}else o=parseFloat(u),s=parseFloat(c);var f=d(e)?e.call(t,n,U({},a)):e;i.css({top:null!=f.top?f.top-a.top+o:void 0,left:null!=f.left?f.left-a.left+s:void 0})}L.fn.data=function(t,e){if(y(t)){if(!this.length)return;var n=this[0],i=tt(n);if(1!==n.nodeType)return i;for(var r=n.attributes,o=r.length;o--;)if(r[o]){var s=r[o].name;0===s.indexOf("data-")&&(i[s=T(s.slice(5))]=at(n,s,i[s]))}return i}return E(t)?this.each((function(){tt(this,t)})):2===arguments.length&&y(e)?this:y(e)?this.length?at(this[0],t,tt(this[0],t)):void 0:this.each((function(){tt(this,t,e)}))},L.fn.empty=function(){return this.each((function(){this.innerHTML=""}))},L.fn.extend=function(t){return M(t,(function(t,e){L.fn[t]=e})),this},L.fn.filter=function(t){if(d(t))return this.map((function(e,n){return t.call(n,e,n)?n:void 0}));if(p(t))return this.map((function(e,n){return L(n).is(t)?n:void 0}));var e=L(t);return this.map((function(t,n){return e.get().indexOf(n)>-1?n:void 0}))},L.fn.first=function(){return this.eq(0)},L.fn.has=function(t){var e=p(t)?this.find(t):L(t),n=e.length;return this.map((function(){for(var t=0;t<n;t+=1)if(F(this,e[t]))return this}))},L.fn.hasClass=function(t){return this[0].classList.contains(t)},M(["Width","Height"],(function(t,e){M(["inner"+e,e.toLowerCase(),"outer"+e],(function(t,n){L.fn[n]=function(n,i){var r=arguments.length&&(t<2||!m(n)),o=!0===n||!0===i;return r?this.each((function(i,r){return lt(r,i,e,t,o,n)})):this.length?ct(this[0],e,t,o):void 0}}))})),L.fn.hide=function(){return this.each((function(){this.style.display="none"}))},M(["val","html","text"],(function(t,e){var n={0:"value",1:"innerHTML",2:"textContent"}[t];function i(e){if(2===t)return et(e,(function(t){return _(t)[n]})).join("");if(e.length){var i=e[0];return 0===t&&L(i).is("select[multiple]")?et(L(i).find("option:checked"),(function(t){return t.value})):i[n]}}function r(e,i){if(y(i)){if(0!==t)return;i=""}1===t&&x(i)&&(i=i.outerHTML),e[n]=i}L.fn[e]=function(e){return arguments.length?this.each((function(n,o){var s=d(e)?e.call(o,n,i(L(o))):e;0===t&&Array.isArray(s)?L(o).is("select[multiple]")?et(L(o).find("option"),(function(t){return t.selected=s.indexOf(t.value)>-1})):o.checked=s.indexOf(o.value)>-1:r(o,s)})):i(this)}})),L.fn.index=function(t){return arguments.length?p(t)?L(t).get().indexOf(this[0]):this.get().indexOf(L(t)[0]):this.eq(0).parent().children().get().indexOf(this[0])},L.fn.last=function(){return this.eq(-1)},M(["","All","Until"],(function(t,e){L.fn["next"+e]=function(e,n){return ot(this,t,"nextElementSibling",e,n)}})),L.fn.not=function(t){var e=this.filter(t);return this.map((function(t,n){return e.index(n)>-1?void 0:n}))},L.fn.offsetParent=function(){return this.map((function(){for(var t=this.offsetParent;t&&"static"===L(t).css("position");)t=t.offsetParent;return t||document.documentElement}))},L.fn.position=function(){if(this.length){var t,e=this.eq(0),n={left:0,top:0};if("fixed"===e.css("position"))t=e[0].getBoundingClientRect();else{t=e.offset();var i=e.offsetParent();(n=i.offset()).top+=ft(i,"border-top-width"),n.left+=ft(i,"border-left-width")}return{top:t.top-n.top-ft(e,"margin-top"),left:t.left-n.left-ft(e,"margin-left")}}},L.fn.offset=function(t){if(!arguments.length){if(!this.length)return;return ht(this[0])}return this.each((function(e){dt(this,t,e)}))},L.fn.one=function(t,e,n,i){return this.on(t,e,n,i,!0)},M(["","All","Until"],(function(t,e){L.fn["prev"+e]=function(e,n){return ot(t?L(this.get().reverse()):this,t,"previousElementSibling",e,n)}})),L.fn.removeAttr=function(t){var e=t.split(" ").filter((function(t){return t}));return this.each((function(){var t=this;M(e,(function(e,n){t.removeAttribute(n)}))}))},L.fn.removeData=function(t){return this.each((function(){nt(this,t)}))},L.fn.removeProp=function(t){return this.each((function(){try{delete this[t]}catch(t){}}))},L.fn.replaceWith=function(t){return this.each((function(e,n){var i=t;d(i)?i=i.call(n,e,n.innerHTML):e&&!p(i)&&(i=L(i).clone()),L(n).before(i)})),this.remove()},L.fn.replaceAll=function(t){var e=this;return L(t).map((function(t,n){return L(n).replaceWith(t?e.clone():e),e.get()}))},L.fn.serializeArray=function(){var t=[];return this.each((function(e,n){var i=n instanceof HTMLFormElement?n.elements:[n];L(i).each((function(e,n){var i=L(n),r=n.type,o=n.nodeName.toLowerCase();if("fieldset"!==o&&n.name&&!n.disabled&&["input","select","textarea","keygen"].indexOf(o)>-1&&-1===["submit","button","image","reset","file"].indexOf(r)&&(-1===["radio","checkbox"].indexOf(r)||n.checked)){var s=i.val();(Array.isArray(s)?s:[s]).forEach((function(e){t.push({name:n.name,value:e})}))}}))})),t},L.fn.serialize=function(){return X(this.serializeArray())};var pt={};L.fn.show=function(){return this.each((function(){var t,e,n;"none"===this.style.display&&(this.style.display=""),"none"===A(this,"display")&&(this.style.display=(t=this.nodeName,pt[t]||(e=document.createElement(t),document.body.appendChild(e),n=A(e,"display"),e.parentNode.removeChild(e),"none"===n&&(n="block"),pt[t]=n),pt[t]))}))},L.fn.siblings=function(t){return this.prevAll(t).add(this.nextAll(t))},L.fn.toggle=function(){return this.each((function(){"none"===A(this,"display")?L(this).show():L(this).hide()}))},L.fn.reflow=function(){return this.each((function(){return this.clientLeft}))},L.fn.transition=function(t){return v(t)&&(t+="ms"),this.each((function(){this.style.webkitTransitionDuration=t,this.style.transitionDuration=t}))},L.fn.transitionEnd=function(t){var e=this,n=["webkitTransitionEnd","transitionend"];function i(r){r.target===this&&(t.call(this,r),M(n,(function(t,n){e.off(n,i)})))}return M(n,(function(t,n){e.on(n,i)})),this},L.fn.transformOrigin=function(t){return this.each((function(){this.style.webkitTransformOrigin=t,this.style.transformOrigin=t}))},L.fn.transform=function(t){return this.each((function(){this.style.webkitTransform=t,this.style.transform=t}))};var vt={};function mt(t,e,n,i){var r=tt(i,"_mdui_mutation");r||tt(i,"_mdui_mutation",r=[]),-1===r.indexOf(t)&&(r.push(t),e.call(i,n,i))}L.fn.mutation=function(){return this.each((function(t,e){var n=L(e);M(vt,(function(i,r){n.is(i)&&mt(i,r,t,e),n.find(i).each((function(t,e){mt(i,r,t,e)}))}))}))},L.showOverlay=function(t){var e=L(".mdui-overlay");e.length?(e.data("_overlay_is_deleted",!1),y(t)||e.css("z-index",t)):(y(t)&&(t=2e3),e=L('<div class="mdui-overlay">').appendTo(document.body).reflow().css("z-index",t));var n=e.data("_overlay_level")||0;return e.data("_overlay_level",++n).addClass("mdui-overlay-show")},L.hideOverlay=function(t){void 0===t&&(t=!1);var e=L(".mdui-overlay");if(e.length){var n=t?1:e.data("_overlay_level");n>1?e.data("_overlay_level",--n):e.data("_overlay_level",0).removeClass("mdui-overlay-show").data("_overlay_is_deleted",!0).transitionEnd((function(){e.data("_overlay_is_deleted")&&e.remove()}))}},L.lockScreen=function(){var t=L("body"),e=t.width(),n=t.data("_lockscreen_level")||0;t.addClass("mdui-locked").width(e).data("_lockscreen_level",++n)},L.unlockScreen=function(t){void 0===t&&(t=!1);var e=L("body"),n=t?1:e.data("_lockscreen_level");n>1?e.data("_lockscreen_level",--n):e.data("_lockscreen_level",0).removeClass("mdui-locked").width("")},L.throttle=function(t,e){void 0===e&&(e=16);var n=null;return function(){for(var i=this,r=[],o=arguments.length;o--;)r[o]=arguments[o];g(n)&&(n=setTimeout((function(){t.apply(i,r),n=null}),e))}};var yt={};function gt(t,e,n,i,r){r||(r={}),r.inst=i;var o=t+".mdui."+e;"undefined"!=typeof jQuery&&jQuery(n).trigger(o,r);var s=L(n);s.trigger(o,r);var a=new CustomEvent(o,{bubbles:!0,cancelable:!0,detail:r});a._detail=r,s[0].dispatchEvent(a)}L.guid=function(t){if(!y(t)&&!y(yt[t]))return yt[t];function e(){return Math.floor(65536*(1+Math.random())).toString(16).substring(1)}var n="_"+e()+e()+"-"+e()+"-"+e()+"-"+e()+"-"+e()+e()+e();return y(t)||(yt[t]=n),n},N.mutation=function(t,e){y(t)||y(e)?L(document).mutation():(vt[t]=e,L(t).each((function(n,i){return mt(t,e,n,i)})))};var bt=L(document),wt=L(window);L("body");var xt={tolerance:5,offset:0,initialClass:"mdui-headroom",pinnedClass:"mdui-headroom-pinned-top",unpinnedClass:"mdui-headroom-unpinned-top"},Ct=function(t,e){void 0===e&&(e={}),this.options=U({},xt),this.state="pinned",this.isEnable=!1,this.lastScrollY=0,this.rafId=0,this.$element=L(t).first(),U(this.options,e);var n=this.options.tolerance;v(n)&&(this.options.tolerance={down:n,up:n}),this.enable()};function Et(t,e){var n=L(t).attr(e);return n?new Function("","var json = "+n+"; return JSON.parse(JSON.stringify(json));")():{}}Ct.prototype.onScroll=function(){var t=this;this.rafId=window.requestAnimationFrame((function(){var e=window.pageYOffset,n=e>t.lastScrollY?"down":"up",i=t.options.tolerance[n],r=Math.abs(e-t.lastScrollY)>=i;e>t.lastScrollY&&e>=t.options.offset&&r?t.unpin():(e<t.lastScrollY&&r||e<=t.options.offset)&&t.pin(),t.lastScrollY=e}))},Ct.prototype.triggerEvent=function(t){gt(t,"headroom",this.$element,this)},Ct.prototype.transitionEnd=function(){"pinning"===this.state&&(this.state="pinned",this.triggerEvent("pinned")),"unpinning"===this.state&&(this.state="unpinned",this.triggerEvent("unpinned"))},Ct.prototype.pin=function(){var t=this;"pinning"!==this.state&&"pinned"!==this.state&&this.$element.hasClass(this.options.initialClass)&&(this.triggerEvent("pin"),this.state="pinning",this.$element.removeClass(this.options.unpinnedClass).addClass(this.options.pinnedClass).transitionEnd((function(){return t.transitionEnd()})))},Ct.prototype.unpin=function(){var t=this;"unpinning"!==this.state&&"unpinned"!==this.state&&this.$element.hasClass(this.options.initialClass)&&(this.triggerEvent("unpin"),this.state="unpinning",this.$element.removeClass(this.options.pinnedClass).addClass(this.options.unpinnedClass).transitionEnd((function(){return t.transitionEnd()})))},Ct.prototype.enable=function(){var t=this;this.isEnable||(this.isEnable=!0,this.state="pinned",this.$element.addClass(this.options.initialClass).removeClass(this.options.pinnedClass).removeClass(this.options.unpinnedClass),this.lastScrollY=window.pageYOffset,wt.on("scroll",(function(){return t.onScroll()})))},Ct.prototype.disable=function(){var t=this;this.isEnable&&(this.isEnable=!1,this.$element.removeClass(this.options.initialClass).removeClass(this.options.pinnedClass).removeClass(this.options.unpinnedClass),wt.off("scroll",(function(){return t.onScroll()})),window.cancelAnimationFrame(this.rafId))},Ct.prototype.getState=function(){return this.state},N.Headroom=Ct;var _t="mdui-headroom";L((function(){N.mutation("[mdui-headroom]",(function(){new N.Headroom(this,Et(this,_t))}))}));var Tt={accordion:!1},kt=function(t,e){void 0===e&&(e={}),this.options=U({},Tt);var n="mdui-"+this.getNamespace()+"-item";this.classItem=n,this.classItemOpen=n+"-open",this.classHeader=n+"-header",this.classBody=n+"-body",this.$element=L(t).first(),U(this.options,e),this.bindEvent()};kt.prototype.bindEvent=function(){var t=this;this.$element.on("click","."+this.classHeader,(function(){var e=L(this).parent();t.getItems().each((function(n,i){e.is(i)&&t.toggle(i)}))})),this.$element.on("click","[mdui-"+this.getNamespace()+"-item-close]",(function(){var e=L(this).parents("."+t.classItem).first();t.close(e)}))},kt.prototype.isOpen=function(t){return t.hasClass(this.classItemOpen)},kt.prototype.getItems=function(){return this.$element.children("."+this.classItem)},kt.prototype.getItem=function(t){return v(t)?this.getItems().eq(t):L(t).first()},kt.prototype.triggerEvent=function(t,e){gt(t,this.getNamespace(),e,this)},kt.prototype.transitionEnd=function(t,e){this.isOpen(e)?(t.transition(0).height("auto").reflow().transition(""),this.triggerEvent("opened",e)):(t.height(""),this.triggerEvent("closed",e))},kt.prototype.open=function(t){var e=this,n=this.getItem(t);if(!this.isOpen(n)){this.options.accordion&&this.$element.children("."+this.classItemOpen).each((function(t,i){var r=L(i);r.is(n)||e.close(r)}));var i=n.children("."+this.classBody);i.height(i[0].scrollHeight).transitionEnd((function(){return e.transitionEnd(i,n)})),this.triggerEvent("open",n),n.addClass(this.classItemOpen)}},kt.prototype.close=function(t){var e=this,n=this.getItem(t);if(this.isOpen(n)){var i=n.children("."+this.classBody);this.triggerEvent("close",n),n.removeClass(this.classItemOpen),i.transition(0).height(i[0].scrollHeight).reflow().transition("").height("").transitionEnd((function(){return e.transitionEnd(i,n)}))}},kt.prototype.toggle=function(t){var e=this.getItem(t);this.isOpen(e)?this.close(e):this.open(e)},kt.prototype.openAll=function(){var t=this;this.getItems().each((function(e,n){return t.open(n)}))},kt.prototype.closeAll=function(){var t=this;this.getItems().each((function(e,n){return t.close(n)}))};var St=function(t){function e(){t.apply(this,arguments)}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getNamespace=function(){return"collapse"},e}(kt);N.Collapse=St;var Ot="mdui-collapse";L((function(){N.mutation("[mdui-collapse]",(function(){new N.Collapse(this,Et(this,Ot))}))}));var jt=function(t){function e(){t.apply(this,arguments)}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.getNamespace=function(){return"panel"},e}(kt);N.Panel=jt;var At="mdui-panel";L((function(){N.mutation("[mdui-panel]",(function(){new N.Panel(this,Et(this,At))}))}));var Rt=function(t){this.$thRow=L(),this.$tdRows=L(),this.$thCheckbox=L(),this.$tdCheckboxs=L(),this.selectable=!1,this.selectedRow=0,this.$element=L(t).first(),this.init()};Rt.prototype.init=function(){this.$thRow=this.$element.find("thead tr"),this.$tdRows=this.$element.find("tbody tr"),this.selectable=this.$element.hasClass("mdui-table-selectable"),this.updateThCheckbox(),this.updateTdCheckbox(),this.updateNumericCol()},Rt.prototype.createCheckboxHTML=function(t){return"<"+t+' class="mdui-table-cell-checkbox"><label class="mdui-checkbox"><input type="checkbox"/><i class="mdui-checkbox-icon"></i></label></'+t+">"},Rt.prototype.updateThCheckboxStatus=function(){var t=this.$thCheckbox[0],e=this.selectedRow,n=this.$tdRows.length;t.checked=e===n,t.indeterminate=!!e&&e!==n},Rt.prototype.updateTdCheckbox=function(){var t=this,e="mdui-table-row-selected";this.$tdRows.each((function(n,i){var r=L(i);if(r.find(".mdui-table-cell-checkbox").remove(),t.selectable){var o=L(t.createCheckboxHTML("td")).prependTo(r).find('input[type="checkbox"]');r.hasClass(e)&&(o[0].checked=!0,t.selectedRow++),t.updateThCheckboxStatus(),o.on("change",(function(){o[0].checked?(r.addClass(e),t.selectedRow++):(r.removeClass(e),t.selectedRow--),t.updateThCheckboxStatus()})),t.$tdCheckboxs=t.$tdCheckboxs.add(o)}}))},Rt.prototype.updateThCheckbox=function(){var t=this;this.$thRow.find(".mdui-table-cell-checkbox").remove(),this.selectable&&(this.$thCheckbox=L(this.createCheckboxHTML("th")).prependTo(this.$thRow).find('input[type="checkbox"]').on("change",(function(){var e=t.$thCheckbox[0].checked;t.selectedRow=e?t.$tdRows.length:0,t.$tdCheckboxs.each((function(t,n){n.checked=e})),t.$tdRows.each((function(t,n){e?L(n).addClass("mdui-table-row-selected"):L(n).removeClass("mdui-table-row-selected")}))})))},Rt.prototype.updateNumericCol=function(){var t=this,e="mdui-table-col-numeric";this.$thRow.find("th").each((function(n,i){var r=L(i).hasClass(e);t.$tdRows.each((function(t,i){var o=L(i).find("td").eq(n);r?o.addClass(e):o.removeClass(e)}))}))};var $t="_mdui_table";L((function(){N.mutation(".mdui-table",(function(){var t=L(this);t.data($t)||t.data($t,new Rt(t))}))})),N.updateTables=function(t){(y(t)?L(".mdui-table"):L(t)).each((function(t,e){var n=L(e),i=n.data($t);i?i.init():n.data($t,new Rt(n))}))};var Ht="touchmove mousemove",Mt="touchend mouseup",It="touchcancel mouseleave",Lt=0;function Nt(t){"touchstart"===t.type?Lt+=1:["touchmove","touchend","touchcancel"].indexOf(t.type)>-1&&setTimeout((function(){Lt&&(Lt-=1)}),500)}function Ft(t,e){if(!(t instanceof MouseEvent&&2===t.button)){var n="undefined"!=typeof TouchEvent&&t instanceof TouchEvent&&t.touches.length?t.touches[0]:t,i=n.pageX,r=n.pageY,o=e.offset(),s=e.innerHeight(),a=e.innerWidth(),u=i-o.left,c=r-o.top,l=Math.max(Math.pow(Math.pow(s,2)+Math.pow(a,2),.5),48),f="translate3d("+(a/2-u)+"px,"+(s/2-c)+"px, 0) scale(1)";L('<div class="mdui-ripple-wave" style="width:'+l+"px;height:"+l+"px;margin-top:-"+l/2+"px;margin-left:-"+l/2+"px;left:"+u+"px;top:"+c+'px;"></div>').data("_ripple_wave_translate",f).prependTo(e).reflow().transform(f)}}function Pt(){var t=L(this);t.children(".mdui-ripple-wave").each((function(t,e){!function(t){if(t.length&&!t.data("_ripple_wave_removed")){t.data("_ripple_wave_removed",!0);var e=setTimeout((function(){return t.remove()}),400),n=t.data("_ripple_wave_translate");t.addClass("mdui-ripple-wave-fill").transform(n.replace("scale(1)","scale(1.01)")).transitionEnd((function(){clearTimeout(e),t.addClass("mdui-ripple-wave-out").transform(n.replace("scale(1)","scale(1.01)")),e=setTimeout((function(){return t.remove()}),700),setTimeout((function(){t.transitionEnd((function(){clearTimeout(e),t.remove()}))}),0)}))}}(L(e))})),t.off(Ht+" "+Mt+" "+It,Pt)}function qt(t){if(function(t){return!(Lt&&["mousedown","mouseup","mousemove","click","mouseover","mouseout","mouseenter","mouseleave"].indexOf(t.type)>-1)}(t)&&(Nt(t),t.target!==document)){var e=L(t.target),n=e.hasClass("mdui-ripple")?e:e.parents(".mdui-ripple").first();if(n.length&&!n.prop("disabled")&&y(n.attr("disabled")))if("touchstart"===t.type){var i=!1,r=setTimeout((function(){r=0,Ft(t,n)}),200),o=function(){r&&(clearTimeout(r),r=0,Ft(t,n)),i||(i=!0,Pt.call(n))};n.on("touchmove",(function(){r&&(clearTimeout(r),r=0),o()})).on("touchend touchcancel",o)}else Ft(t,n),n.on(Ht+" "+Mt+" "+It,Pt)}}L((function(){bt.on("touchstart mousedown",qt).on("touchend touchmove touchcancel",Nt)}));function Dt(t){return void 0===t&&(t=!1),'<div class="mdui-spinner-layer '+(t?"mdui-spinner-layer-"+t:"")+'"><div class="mdui-spinner-circle-clipper mdui-spinner-left"><div class="mdui-spinner-circle"></div></div><div class="mdui-spinner-gap-patch"><div class="mdui-spinner-circle"></div></div><div class="mdui-spinner-circle-clipper mdui-spinner-right"><div class="mdui-spinner-circle"></div></div></div>'}function Bt(t){var e=L(t),n=e.hasClass("mdui-spinner-colorful")?Dt(1)+Dt(2)+Dt(3)+Dt(4):Dt();e.html(n)}return L((function(){N.mutation(".mdui-spinner",(function(){Bt(this)}))})),N.updateSpinners=function(t){(y(t)?L(".mdui-spinner"):L(t)).each((function(){Bt(this)}))},N}));

/** 水波纹 */
$("#mw-site-navigation li, #mw-related-navigation li, #personal li, .mini-block-container li, .tools-inline li, .oo-ui-buttonElement-button, .suggestions .suggestions-special, .suggestions a.mw-searchSuggest-link, .mw-editsection a, #p-variants-desktop .dropdown li, .flowthread-btn, .oo-ui-dropdownWidget, .oo-ui-menuOptionWidget, .mw-htmlform-field-UploadSourceField .mw-input, #profile-toggle-button, .mw-specialpages-list li, .comment-reply, .comment-like, .comment-report, .comment-delete, #personal-extra li, .sidebar-chunk h2").addClass("mdui-ripple");
$(".comment-submit, #profile-toggle-button").addClass("mdui-ripple-white");

/** JUMP */
$("#p-banner, #ca-ve-edit a, #ca-edit a, #ca-viewsource a, #ca-history a, #ca-watch a, #ca-unwatch a, #ca-nstab-main a, #ca-nstab-template a, #ca-nstab-userwiki a, #ca-nstab-mediawiki a, #ca-nstab-user a, #ca-nstab-help a, #ca-nstab-image a, #ca-nstab-project a, #ca-nstab-media a, #ca-nstab-category a, #ca-nstab-data a, #ca-talk a, #ca-view a, #ca-flowthreadcontrol a, #ca-timedtext a, #ca-nstab-timedtext a, #ca-nstab-widget a, #t-contributions a, #p-variants-desktop h3, .header-links-a").addClass("jumpanim");

/** 修复搜索栏闪动 */
$("#simpleSearch").removeClass("opacityhide");

/** 滚动添加class */
$(window).scroll(function () {
	var scrollTop = $(document).scrollTop();
	if (scrollTop >= 30) {
		$("body").addClass("scrolled");
		$(".header-links-li").addClass("mdui-ripple");
	} else {
		$("body").removeClass("scrolled");
		$(".header-links-li").removeClass("mdui-ripple");
	}
});

/*ART*/
var kawaiiconsole = String("\n✦ 音MAD万岁! ✦\n _____   ______  _____   ___  __  ______  ____        __      __  ______   __  __   ______     \n/\\  __ \\/\\__  _\\/\\  __ \\ \\  \\_\\ \\/\\  _  \\/\\  _ \\     /\\ \\  __/\\ \\/\\__  _\\ /\\ \\/\\ \\ /\\__  _\\    \n\\ \\ \\/\\ \\/_/\\ \\/\\ \\ \\/\\ \\/\\      \\ \\ \\/\\ \\ \\ \\/\\ \\   \\ \\ \\/\\ \\ \\ \\/_/\\ \\/ \\ \\ \\/ / \\/_/\\ \\/    \n \\ \\ \\ \\ \\ \\ \\ \\ \\ \\ \\ \\ \\ \\ \\__\\ \\ \\  __ \\ \\ \\ \\ \\   \\ \\ \\ \\ \\ \\ \\ \\ \\ \\  \\ \\   <    \\ \\ \\    \n  \\ \\ \\_\\ \\ \\ \\ \\ \\ \\ \\_\\ \\ \\ \\_/\\ \\ \\ \\/\\ \\ \\ \\_\\ \\   \\ \\ \\_\\ \\_\\ \\ \\_\\ \\__\\ \\ \\\\ \\   \\_\\ \\__ \n   \\ \\_____\\ \\ \\_\\ \\ \\_____\\ \\_\\\\ \\_\\ \\_\\ \\_\\ \\____/    \\ \\____/___/ /\\_____\\\\ \\_\\ \\_\\ /\\_____\\\n    \\/_____/  \\/_/  \\/_____/\\/_/ \\/_/\\/_/\\/_/\\/___/      \\/___//__/  \\/_____/ \\/_/\\/_/ \\/_____/\n\n       ✧ Otomad Wiki ✧\n        - Designed by Aira in Shanghai # KAWAII FOREVER #\n         - Version: MediaWiki 1.39.3\n          - Timeless Kawaii Version: 3.2.230519\n")

console.log('%c%s', 'color: #f06e8e', kawaiiconsole);

/** 卸载时在Console输出bye */
window.addEventListener('beforeunload', function() {
  console.log('%c%s', 'color: #f06e8e', 'Bye~');
})
