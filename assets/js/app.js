window.brayn = window.brayn || {};

/**
 * Load script by Ajax
 */
jQuery.cachedScript = function( url, options ) {
	"use strict";
	options = jQuery.extend( options || {}, {
		dataType: "script",
		cache: true,
		url: url
	});
	return jQuery.ajax( options );
};

// Hero image animation
window.brayn.heroRipple = function($) {
	"use strict";
	var hr = {
		init: function() {
			var x=this;
			x.sizes={};
			x.onResize = x.destroyed = false;
			x.el = x.renderer = x.stage = x.canvascontainer = x.nimage = x.iRender = x.baseTimeline = x.image = x.filter = x.after = null;

			PIXI.utils.skipHello();
			x.getWindowSize();
		},
		start:function( el, image, filter, after ) {
			var x=this;

			x.destroyed = false;
			x.el = el;
			x.image = image;
			x.filter = filter;
			x.after = after;
			
			x.getWindowSize();

			x.build_renderer();

			if ( ! PIXI.loader.resources.hasOwnProperty( x.filter ) ) {
				PIXI.loader.add( x.filter );
			}

			if ( ! PIXI.loader.resources.hasOwnProperty( x.image ) ) {
				PIXI.loader.add( x.image );
			}

			PIXI.loader.load(function(loader, resources){
				x.setup();
			});
		},
		setup: function() {
			var x=this;

			// reset renderer
			if ( ! x.renderer instanceof PIXI.CanvasRenderer ) {
				x.renderer.reset();
			}

			x.stage = new PIXI.Container();
			x.canvascontainer = new PIXI.Container();

			var displacementSprite = new PIXI.Sprite( PIXI.loader.resources[x.filter].texture );
			var displacementFilter = new PIXI.filters.DisplacementFilter( displacementSprite );

			displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
			displacementSprite.scale.x = 1.2;
			displacementSprite.scale.y = 1.2;

			// append the canvas to element
			x.el.appendChild( x.renderer.view );
			// style up the canvas
			x.renderer.view.style.position  = 'absolute';
			x.renderer.view.style.maxWidth  = '100%';
			x.renderer.view.style.width     = '100%';
			x.renderer.view.style.height    = '100%';
			x.renderer.view.style.zIndex    = '-99';
			x.renderer.view.style.top       = '0';
			x.renderer.view.style.left      = '0';
			x.renderer.view.style.opacity   = '0';
			x.renderer.view.style.webkitPerspective = '1000';

			x.stage.addChild( x.canvascontainer );
			x.stage.addChild( displacementSprite );
			x.stage.interactive = false;
			x.stage.filters = [displacementFilter];

			// setup the filter
			displacementFilter.scale.alpha = 0;
			displacementFilter.scale.x = 20;
			displacementFilter.scale.y = 20;

			x.nimage = new PIXI.Sprite( PIXI.loader.resources[x.image].texture );
			x.sizes.tw = PIXI.loader.resources[x.image].texture.width;
			x.sizes.th = PIXI.loader.resources[x.image].texture.height;
	
			// set the size
			x.resizeImage();

			x.canvascontainer.alpha = 0;
			x.canvascontainer.scale.x = 0.5;
			x.canvascontainer.scale.y = 0.5;
			x.canvascontainer.addChild( x.nimage );

			x.iRender = new PIXI.ticker.Ticker();
			x.iRender.autoStart = true;
			x.iRender.add(function( delta ) {
				if ( !x.destroyed && x.renderer ) {
					displacementSprite.x += 10 * delta;
					displacementSprite.y += 3;
					x.renderer.render( x.stage );
				}
			});

			$(window).one('braynHasFinishLoad', function () {
				x.showit(displacementSprite, displacementFilter);
				x.listenEvent();
			});

		},
		showit: function(displacementSprite, displacementFilter) {
			var x=this;
			x.baseTimeline = new anime.timeline({
				loop: false,
				autoplay: true,
				complete: function() {
					$(x.el).find('img').css({opacity:1});
					window.requestTimeout( function() {
						x.canvascontainer.alpha = 0;
						displacementSprite.texture.baseTexture.dispose();
						x.__destroy();
						$(x.el).find('canvas').detach();
					},50);
				}
			});

			x.canvascontainer.position.x = ( $(x.el).width() - (x.nimage.width/2) )/2;
			x.canvascontainer.position.y = $(x.el).height();
			x.renderer.view.style.opacity   = '1';
			var endScale = ( /iPad|iPhone|iPod|Android/.test(navigator.userAgent) ) ? {x:0,y:0} : {x:2,y:2};
			x.baseTimeline.add({
				targets: x.canvascontainer,
				duration: 1000,
				alpha: 1,
				easing: 'easeInOutCirc',
			}).add({
				targets: x.canvascontainer.position,
				duration: 1000,
				y: ( $(x.el).height() - (x.nimage.height/2) )/2,
				easing: 'easeInOutCirc',
			}, '-=1000').add({
				targets: x.canvascontainer.scale,
				duration: 1500,
				x: 1,
				y: 1,
				easing: 'easeInOutCirc',
			}).add({
				targets: x.canvascontainer.position,
				duration: 1500,
				y: (x.nimage.height-$(x.el).height())/-2,
				x: (x.nimage.width-$(x.el).width())/-2,
				easing: 'easeInOutCirc',
				complete: function() {
					if ( typeof x.after === 'function' ) {
						x.after();
					}
				}
			}, '-=1500').add({
				targets: displacementSprite.scale,
				duration: 1000,
				x: 1,
				y: 1,
				easing: 'easeInOutCirc'
			}).add({
				targets: displacementFilter.scale,
				duration: 2000,
				x: endScale.x,
				y: endScale.y,
				delay: 1500,
				easing: 'easeInOutCirc'
			});	
		},
		build_renderer: function() {
			var x=this;
			if ( x.renderer ) {
				return x.renderer;
			}

			x.renderer = new PIXI.autoDetectRenderer( x.sizes.w, x.sizes.h, { transparent: true, autoResize: true });
			return x.renderer;
		},
		resizeImage: function() {
			var x=this;

			if ( x.onResize ) {
				window.clearRequestTimeout( x.onResize );
			}

			x.onResize = window.requestTimeout(function(){
				x.nimage.width = $(x.el).find('img').width();
				x.nimage.height = ($(x.el).find('img').width()/x.sizes.tw)*x.sizes.th;
				if ( x.nimage.height < $(x.el).height() ) {
					x.nimage.width = ($(x.el).height()/x.nimage.height)*x.nimage.width;
					x.nimage.height = $(x.el).height();
				}

				x.canvascontainer.position.x = (x.nimage.width-$(x.el).width())/-2;
				x.canvascontainer.position.y = (x.nimage.height-$(x.el).height())/-2;
			},10);
		},
		resize: function() {
			var x=this;
			x.resizeImage();
			x.renderer.resize( x.sizes.w, x.sizes.h );
			
		},
		listenEvent: function() {
			var x=this;

			$(window).on('resize',function(){
				if ( !x.destroyed ) {
					x.getWindowSize();
					x.resize();
				}
			});		
		},
		__destroy: function() {
			var x=this;

			x.stage.filters = null;
			x.iRender.remove();
			x.canvascontainer.removeChild();
			x.stage.removeChild();
			x.renderer.destroy();
			x.renderer = x.stage = x.canvascontainer = x.nimage = x.iRender = x.baseTimeline = x.image = x.filter = x.after = null;
			x.destroyed = true;
		},
		getWindowSize: function() {
			var x=this,
				wdw=window,
				d=document,
				e=d.documentElement,
				g=d.getElementsByTagName('body')[0];

			x.sizes.w = wdw.innerWidth||e.clientWidth||g.clientWidth;
			x.sizes.h = wdw.innerHeight||e.clientHeight||g.clientHeight;
		}
	};
	hr.init();
	return hr;
}(window.jQuery);

// Animation images, use it only for few sections,
// webGL is awesome, but it cost memory more
var pSlideCanvas = function () {
  function pSlideCanvas(parentEl, el, interaction, filterObj, sizes) {
    "use strict";

    _classCallCheck(this, pSlideCanvas);

    PIXI.utils.skipHello();
    this.build = {};
    this.build.parentEl = parentEl;
    this.build.el = el;
    this.build.sizes = sizes;
    this.build.interaction = interaction;
    this.build.filterObj = filterObj;

    if (typeof this.build.filterObj === 'undefined') {
      this.build.filterObj = 'assets/images/clouds-s.jpg';
    }

    this.build.baseTimeline = new Array();
    this.readAssets();
  }

  _createClass(pSlideCanvas, [{
    key: "readAssets",
    value: function readAssets() {
      var that = this;
      this.build.count = 0;
      this.build.elemSizes = [];
      that.build.hovered = [];

      if (Array.isArray(that.build.el)) {
        that.build.el.forEach(function (ell) {
          that.loadAssets(ell, that.build.count);
          that.build.elemSizes[that.build.count] = {
            el: ell,
            width: jQuery(ell).find('img').width(),
            height: jQuery(ell).find('img').height()
          };
          that.build.hovered[that.build.count] = false;
          ++that.build.count;
        });
      } else {
        that.build.elemSizes[that.build.count] = {
          el: that.build.el,
          width: jQuery(that.build.el).find('img').width(),
          height: jQuery(that.build.el).find('img').height()
        };
        that.build.hovered[that.build.count] = false;
        that.loadAssets(that.build.el, that.build.count);
      }

      this.build.loader.add('objFilter', that.build.filterObj);
      this.build.loader.load(function (loader, resources) {
        that.buildCanvas(loader, resources);
        loader.reset();
      });
    }
  }, {
    key: "loadAssets",
    value: function loadAssets(ell, counter) {
      if (typeof this.build.loader === 'undefined') {
        this.build.loader = new PIXI.loaders.Loader();
      }

      this.build.loader.add('objSprite' + counter, jQuery(ell).find('img').attr('src'));
    }
  }, {
    key: "buildCanvas",
    value: function buildCanvas(loader, resources) {
      var that = this;

      if (typeof that.build.renderer === 'undefined') {
        that.build.renderer = new PIXI.autoDetectRenderer(that.build.sizes.width, that.build.sizes.height, {
          transparent: true,
          autoResize: true
        });
      }

      that.build.stage = new PIXI.Container();
      that.build.displacementSprite = new PIXI.Sprite.fromImage(that.build.filterObj);
      that.build.displacementFilter = new PIXI.filters.DisplacementFilter(that.build.displacementSprite);
      jQuery(that.build.parentEl).append(that.build.renderer.view);
      that.build.stage.interactive = true;
      that.build.slidesContainer = new Array();
      that.build.image = new Array();

      for (var i = 0; i < that.build.elemSizes.length; i++) {
        that.build.slidesContainer[i] = new PIXI.Container();
        var texture = new PIXI.Texture.fromImage(loader.resources['objSprite' + i].url);
        that.build.image[i] = new PIXI.Sprite(texture);
        that.build.image[i].width = that.build.elemSizes[i].width;
        that.build.image[i].height = that.build.elemSizes[i].height;
        that.build.slidesContainer[i].alpha = 0;
        that.build.slidesContainer[i].addChild(that.build.image[i]);
        that.build.stage.addChild(that.build.slidesContainer[i]);
      }

      that.build.renderer.view.style.position = 'absolute';
      that.build.renderer.view.style.maxWidth = '100%';
      that.build.renderer.view.style.width = '100%';
      that.build.renderer.view.style.height = '100%';
      that.build.renderer.view.style.zIndex = '-1';
      that.build.renderer.view.style.top = '50%';
      that.build.renderer.view.style.left = '50%';
      that.build.renderer.view.style.webkitTransform = 'translate( -50%, -50% )';
      that.build.renderer.view.style.transform = 'translate( -50%, -50% )';
      that.build.displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
      that.build.displacementSprite.scale.x = 5;
      that.build.displacementSprite.scale.y = 5;
      that.build.stage.addChild(that.build.displacementSprite);
      that.build.stage.filters = [that.build.displacementFilter];
      that.build.displacementFilter.scale.alpha = 0;
      that.build.displacementFilter.scale.x = 900;
      that.build.displacementFilter.scale.y = 450;
      that.build.iRender = new PIXI.ticker.Ticker();
      that.build.iRender.autoStart = true;
      that.build.iRender.add(function (delta) {
        if (that.build && that.build.renderer) {
          that.build.renderer.render(that.build.stage);
        }
      });

      if (that.build.interaction === 'hover') {
        that.listenEvent();
      } else if (that.build.interaction === 'hide') {
        that.build.displacementSprite.scale.x = 2;
        that.build.displacementSprite.scale.y = 2;
        that.attachNewListener();
      } else {
        that.build.displacementSprite.scale.x = 2;
        that.build.displacementSprite.scale.y = 2;
        that.show_destroy();
      }
    }
  }, {
    key: "attachNewListener",
    value: function attachNewListener() {
      var that = this;
      jQuery(that.build.parentEl).on('customShowCanvas', function () {
        that.build.baseTimeline = new anime.timeline({
          loop: false,
          autoplay: true,
          complete: function complete() {
            jQuery(that.build.parentEl).find('img').css({
              opacity: 1
            });

            for (var i = 0; i < that.build.slidesContainer.length; i++) {
              that.build.slidesContainer[i].alpha = 0;
            }

            that.build.displacementFilter.scale.alpha = 0;
            that.build.displacementFilter.scale.x = 900;
            that.build.displacementFilter.scale.y = 450;
            that.build.displacementSprite.scale.x = 2;
            that.build.displacementSprite.scale.y = 2;
          }
        });
        that.build.baseTimeline.add({
          targets: that.build.displacementFilter.scale,
          duration: 1000,
          alpha: 1,
          x: 0,
          y: 0,
          easing: 'easeInOutCirc'
        }).add({
          targets: that.build.slidesContainer,
          duration: 1000,
          alpha: 1,
          easing: 'easeInOutCirc'
        }, '-=1000');
      });
    }
  }, {
    key: "listenEvent",
    value: function listenEvent() {
      var that = this;
      jQuery(window).on('braynBeforeLoadNewCanvas', function () {
        jQuery(window).off('resize');
      });
      $(that.build.slidesContainer).each(function (i) {
        var k = i;
        jQuery(that.build.elemSizes[k].el).on('mouseover', function () {
          requestAnimationFrame(function () {
            if (!that.build.hovered[k]) {
              that.showit(k);
              that.build.baseTimeline[k].play();
            } else {
              that.build.baseTimeline[k].play();
              that.build.baseTimeline[k].reverse();
            }
          });
        }).on('mouseleave', function () {
          requestAnimationFrame(function () {
            that.build.baseTimeline[k].play();
            that.build.baseTimeline[k].reverse();
          });
        });
      });
    }
  }, {
    key: "showit",
    value: function showit(i) {
      var that = this;
      that.build.baseTimeline[i] = new anime.timeline({
        loop: false,
        autoplay: false,
        complete: function complete() {
          that.build.hovered[i] = true;
        }
      });
      var koko = that.build.slidesContainer[i];
      that.build.baseTimeline[i].add({
        targets: that.build.displacementFilter.scale,
        duration: 1000,
        alpha: 1,
        x: 0,
        y: 0,
        easing: 'easeInOutCirc'
      }).add({
        targets: koko,
        duration: 1000,
        alpha: 1,
        easing: 'easeInOutCirc'
      }, '-=1000');
    }
  }, {
    key: "show_destroy",
    value: function show_destroy() {
      var that = this;
      that.build.baseTimeline = new anime.timeline({
        loop: false,
        autoplay: true,
        complete: function complete() {
          jQuery(that.build.parentEl).find('img').css({
            opacity: 1
          });
          window.requestTimeout(function () {
            that.build.displacementFilter.scale.alpha = 0;

            for (var i = 0; i < that.build.slidesContainer.length; i++) {
              that.build.slidesContainer[i].alpha = 0;
            }

            that.__destroy();
          }, 50);
        }
      });
      that.build.baseTimeline.add({
        targets: that.build.displacementFilter.scale,
        duration: 1200,
        alpha: 1,
        x: 0,
        y: 0,
        easing: 'easeInOutCirc'
      }).add({
        targets: that.build.slidesContainer,
        duration: 1200,
        alpha: 1,
        easing: 'easeInOutCirc'
      }, '-=1200');
    }
  }, {
    key: "__destroy",
    value: function __destroy() {
      this.build.stage.filters = null;
      this.build.iRender.remove();
      this.build.stage.removeChild();
      this.build.baseTimeline = this.build.slidesContainer = this.build.displacementSprite = this.build.displacementFilter = this.build.itexture = this.build.image = null;
      this.build.renderer.destroy(true);
    }
  }]);

  return pSlideCanvas;
}();

/**
 * Custom scroll event
 * @author wip-themes
 * for Aiteko version 1.1.0
 */
(function($){
	$.fn.aitekoScrollbar = function (options) {
		var settings = $.extend({}, $.fn.aitekoScrollbar.defaults, options);

		return this.each(function(){
			var d=this,
				requestScrollId = null,
				scroller = {
					target: d,
					ease: settings.ease,
					endY: 0,
					y: 0,
					resizeRequest: 1,
					scrollRequest: 0,
				};

			function updateScroller() {
				var body = document.body,
					html = document.documentElement,
					resized = scroller.resizeRequest > 0,
					useSmoothScroll = true;

				if ( html.className.includes('default-scroll') ) {
					useSmoothScroll = false;
				}

				if (resized) {
					var height = scroller.target.clientHeight;
						body.style.height = height + "px";
						scroller.resizeRequest = 0;
				}

				var scrollY = window.pageYOffset || html.scrollTop || body.scrollTop || 0;

				scroller.endY = scrollY;
				scroller.y += (scrollY - scroller.y) * scroller.ease;

				if (Math.abs(scrollY - scroller.y) < 0.05 || resized) {
					scroller.y = scrollY;
					scroller.scrollRequest = 0;
				}

				if ( /iPad|iPhone|iPod|Android/.test(navigator.userAgent) || useSmoothScroll === false ) {

					scroller.target.style.msTransform = 'matrix(1, 0, 0, 1, 0, 0)';
					scroller.target.style.webkitTransform = 'matrix(1, 0, 0, 1, 0, 0)';
					scroller.target.style.transform = 'matrix(1, 0, 0, 1, 0, 0)';
					$(scroller.target).parent().css({'position': 'absolute'});

					// incase someone need to play around with these values
					$(window).trigger('braynScrolled', [scroller, scrollY ]);	
				} else {

					$(scroller.target).parent().css({'position': ''});

					scroller.target.style.willChange = 'transform';
					scroller.target.style.msTransform = 'matrix(1, 0, 0, 1, 0, '+ -scroller.y +')';
					scroller.target.style.webkitTransform = 'matrix(1, 0, 0, 1, 0, '+ -scroller.y +')';
					scroller.target.style.transform = 'matrix(1, 0, 0, 1, 0, '+ -scroller.y +')';

					// incase someone need to play around with these values
					$(window).trigger('braynScrolled', [scroller, scroller.y]);
				}

				requestScrollId = scroller.scrollRequest > 0 ? requestAnimationFrame( updateScroller ) : null;
			};

			function onResize() {
				var body = document.body;

				scroller.scrollRequest++;
				if (!requestScrollId) {
					requestScrollId = requestAnimationFrame( updateScroller );
				}
			};

			function onScroll() {
				scroller.scrollRequest++;

				if (!requestScrollId) {
					requestScrollId = requestAnimationFrame( updateScroller );
				}
			};

			function tracking() {
				var el = scroller.target,
					body = document.body,
					c = document.createDocumentFragment(),
					sizes = {};

				var div = document.createElement('div');

				c.appendChild(div);
				div.className = 'aitekoresizedetect';
				div.style.position = 'absolute';
				div.style.width = 'auto';
				div.style.height = 'auto';
				div.style.top = 0;
				div.style.left = 0;
				div.style.bottom = 0;
				div.style.right = 0;
				div.style.zIndex = -1;
				div.style.overflow = 'hidden';
				div.style.visibility = 'hidden';
				div.innerHTML = "<iframe id='displayframe' style='height:100%;width:0;border:0;visibility:visible;margin:0'></iframe>";

				if ( $('.aitekoresizedetect').length < 1 ) {
					el.appendChild(c);
				}
				
				var iframeWin = document.getElementById('displayframe').contentWindow;
				iframeWin.addEventListener('resize', function(){
					var h = this.document.body.scrollHeight;
					body.style.height = h + "px";
				});
			};

			function init() {
				$(window).scrollTop(0);
				updateScroller();
				window.focus();
				tracking();
				window.addEventListener("resize", onResize );
				document.addEventListener("scroll", onScroll );

				$(document).ready( function() {
					$(window).scrollTop(0);
					$('html, body').scrollTop(0);
					$(scroller.target).parent().scrollTop(0);
				});
			};
			init();
		});
	};

	$.fn.aitekoScrollbar.defaults = {
		ease: 0.10
	};
})(window.jQuery);

window.brayn.frontend = function($) {
	"use strict";
	var z = {
		$win: $(window),
		$doc: $(document),
		init: function() {
			var d=this;
			d.headerSize = d.origScroll = 0;
			d.onMenuShow = d.menuShowed = d.getter = d.getterProcess = d.onAjaxProgress = d.popStateProcess = false;
			d.initialLoaded = true;
			d.blurryImage = {};

			d.$doc.ready(function(){
				PIXI.utils.skipHello();
				d.initialLoadHistory();
				d.parallaxInit();
			});

			d.$win.on('load', function() {
				d.getHeaderSize();

				d.$doc.unbind().on('click', 'a', function(e){
					var z=this;

					if ( z.href.indexOf('#') !== -1 ) {
						var ccid = z.hash.substring(1),
							realURL = z.href.substr(0,z.href.indexOf('#'));

						// Process haschange
						if (ccid && ( z.pathname === window.location.pathname ) ) {
							e.preventDefault();
							d.hashChangeHandler(z);
							return false;
						}
					}

					if ( d.linkisLocal(z) ) {
						// if other pages still in process, cancel.
						if ( d.onAjaxProgress ) {
							return false;
						}

						// tell our script, that we are not in firsload anymore.
						d.initialLoaded = false;
						// start the transition.
						d.callthepage(e);
					}
				});

			});

			d.$win.on('hashchange', function (e) {
				return false;
			});

			// Popstate even a.k.a next/previous browser history
			window.addEventListener('popstate', function(e){
				var evo = e;
				$(window).trigger('braynBeforeLoadNewCanvas');
				d.popStateProcess = requestAnimationFrame( function() {
					d.popStateHandler(evo);
				});
			});

			// only trigger on the first time page load
			d.$win.on('braynHasDoneLoad', function() {
				d.removeLoader();
			});

			// The event after loader is completely removed
			d.$win.on('braynHasFinishLoad', function() {
				if ( d.popStateProcess ) {
					cancelAnimationFrame(d.popStateProcess);
					d.popStateProcess = !d.popStateProcess;
				}
				d.shrinkHeader();
				d.funcCaller();
				d.prettyReveal();
				d.menuListener();

				d.origScroll = d.$win.scrollTop();

				$('#scroll-viewport').aitekoScrollbar();

				if ( window.location.hash ) {
					var tgt = window.location.hash.substring(1);
					if ( tgt ) {
						window.requestTimeout(function(){
							if ( /iPad|iPhone|iPod|Android/.test(navigator.userAgent) || document.documentElement.className.includes('default-scroll') ) {
								$('html, body').animate({ scrollTop : Math.round($('#'+tgt).offset().top)-100 }, 300 );
							} else {
								$(window).scrollTop( Math.round($('#'+tgt).offset().top)-100 );
							}
							
						}, 500);
					}
				}

				d.processContactForm();

			});

			// resize
			d.$win.on('resize', function(e) {
				d.getHeaderSize();
				d.floatEdgeMedia();
			});

			// Scroll.
			d.$win.on('scroll', function() {
				d.shrinkHeader();
				d.watchPortfolioGridItems();
			});

			d.$win.on('braynScrolled', function(e, bs, bstop) {

				if ( ( bstop < d.$win.height() ) && $('.jarallax-img').length && ( /iPad|iPhone|iPod|Android/.test(navigator.userAgent) === false ) ) {
					$('.jarallax-img').css({
						webkitTransform: 'translate3d(0, '+ ( bstop === 0 ? 0 : bstop*0.5 ) +'px, 0)',
						transform: 'translate3d(0, '+ ( bstop === 0 ? 0 : bstop*0.5 ) +'px, 0)',
					});

					if ( $('#brayn-section-hero').find('canvas').length ) {
						$('#brayn-section-hero').find('canvas').css({top: ( bstop === 0 ? 0 : bstop*0.5 ) +'px'});
					}
				}
			});
		},

		/**
		 * The initial load a.k.a first time load OR after refresh
		 *
		 * @since 1.0.0
		 */
		initialLoadHistory: function() {
			var d=this, data={};

			// save the current page data
			data['doc_title'] = $('title').html(),
			data['main_content'] = $('#main').html(),
			data['body_classes'] = $('body').attr('class');

			// in any case user modify the template
			// add more scripts, etc.
			var dynamicScripts = $('script');
			if ( $(dynamicScripts).length ) {
				var scriptLinks = {};
				$(dynamicScripts).each( function(i) {
					var _scriptcontent = ( typeof $(this).attr('src') !== 'undefined' ? $(this).attr('src') : $(this).html() ),
						_scriptid = ( typeof $(this).attr('src') !== 'undefined' ? 'src_'+i : 'content_'+i );
					scriptLinks[_scriptid] = _scriptcontent;
				});
				data['embeded_scripts'] = scriptLinks;
			}

			//save to browser history API
			history.replaceState( data, data['doc_title'], '' );
		},

		hashChangeHandler: function(el) {
			var ccid = el.hash.substring(1);
			if ( ccid ) {
				if ( /iPad|iPhone|iPod|Android/.test(navigator.userAgent) || document.documentElement.className.includes('default-scroll') ) {
					$('html, body').animate({ scrollTop : Math.round($('#'+ccid).offset().top)-100 }, 300 );
				} else {
					$(window).scrollTop( Math.round($('#'+ccid).offset().top)-100 );
				}
			}
		},

		/**
		 * Popstate handler
		 *
		 * @since 1.0.0
		 */
		popStateHandler: function(e) {
			var d=this;

			if ( !e.state || typeof e.state.doc_title === 'undefined' ) {
				cancelAnimationFrame(d.popStateProcess);
				d.popStateProcess = !d.popStateProcess;
				return false;		
			}

			if ( d.menuShowed ) {
				// close the menu
				$('button.hamburger__menu').trigger('click');
			}
			$('title').html( e.state.doc_title );

			requestAnimationFrame( function() {
				d.pageTransit();
			});

			d.$win.one('braynReadyForNewPage', function() {
				$(window).scrollTop(0);
				$('#site').removeAttr('style');
				$('body').removeAttr('style').attr('class', e.state.body_classes );
				$('#main').removeAttr('style').html(e.state.main_content);

				// apply the scripts, incase any special script for different pages
				if ( typeof e.state.embeded_scripts !== 'undefined' ) {
					var _js = e.state.embeded_scripts, scriptDiv = $("<div id='brayn-mo-script' />");
					
					if ( $('#brayn-mo-script').length < 1 ) {
						$('body').append($(scriptDiv));
						$('#brayn-mo-script').css({width:0,height:0,overflow:'hidden'});
					} else {
						$('#brayn-mo-script').html('');
					}

					$('style[id*="jarallax-clip"]').detach().remove();
					$('script').each(function() {
						var js__src = ( typeof $(this).attr('src') !== 'undefined' ? $(this).attr('src') : '' );
						if ( js__src.indexOf('assets/js/jquery.min.js') == -1 && js__src.indexOf('assets/js/app.js') == -1 && js__src.indexOf('assets/js/plugins.js') == -1 ) {
							$(this).detach().remove();
						}
					});

					for( var _jsid in _js ) {
						if (_js.hasOwnProperty(_jsid)) {
							if ( _jsid.includes('content_') !== false ) {
								if ( _js[_jsid].includes('aitekoRender') === false ) {
									var jscontent = _js[_jsid];
									jscontent = $.trim(jscontent);
									jscontent = jscontent.replace('jQuery(document).ready', 'jQuery(window).load');
									jscontent = jscontent.replace('$(document).ready', 'jQuery(window).load');

									$('#brayn-mo-script').append( $('<script type="text/javascript">'+jscontent+'</script>') );
									jscontent = null;
								}
							} else {
								if ( $('script[src="'+_js[_jsid]+'"]').length < 1 && _js[_jsid].indexOf('assets/js/brayn-firstload.js') == -1 ) {
									$.cachedScript( _js[_jsid] ).done( function( script, textStatus ) {});
								}
							}
						}
						_jsid = null;
					}
					_js = scriptDiv = null;
				}

				d.parallaxInit();
				d.getHeaderSize();

				if ( $('.portfolio-grid-lists').length ) {
					$('.portfolio-grid-lists').find('.image-shadow').each(function(v){
						var c=this,
							data = {
								el: c,
								image: c.querySelector("img"),
								id: v
							};
						d.canvasBlur(data);
					});
				}

				window.requestTimeout(function(){
					$('#transit_roler').find('.trload').css({opacity: 0});
					anime({
						targets: ['#transit_roler .trl', '#transit_roler .trr'],
						height: ['100%','0%'],
						duration: 500,
						delay: function(el, i, l) { return i * 200; },
						easing: 'easeInOutCirc',
						complete: function() {
							$('#transit_roler').css({height: 0, overflow: 'hidden'});
							$(window).trigger('load');
							$(window).trigger('braynHasFinishLoad');
						}
					});
				},500);
			});
		},

		/**
		 * The main ajax processing start from here
		 *
		 * @since 1.0.0
		 */
		// callthepage: function(e) {
			// var d=this,
				// nTarget = e.currentTarget.pathname + e.currentTarget.search;
// 
			// // Don't process if the link is same as current window
			// if ( nTarget !== (window.location.pathname + window.location.search) ) {
				// e.preventDefault();
// 
				// // Lock. Until all finishes
				// d.onAjaxProgress = true;
				// $(window).trigger('braynBeforeLoadNewCanvas');
// 
				// // If user click on link inside the menu
				// if ( d.menuShowed ) {
					// $('body').removeAttr('style');
					// $(window).scrollTop(0);
				// }
				// d.triggerAjax( e.currentTarget.href );
			// }
			// e.preventDefault();
			// return false;
		// },

		// triggerAjax: function( dest_url ) {
			// var d=this, data={};
			// if ( typeof dest_url === 'undefined' ) {
				// return false;
			// }
// 
			// // Remove any pointer events
			// $('body').css({
				// cursor: 'progress',
				// pointerEvents: 'none'
			// });
// 
			// d.shrinkContent();
// 
			// // Do the Ajax!!
			// d.$win.one( 'braynCanvasReady', function() {
				// $.ajax({
					// url : dest_url,
					// type: 'GET',
					// error: function(httpRequest, textStatus, errorThrown) {
						// alert( 'Something wrong! We got ' + httpRequest.status + ' - ('+ textStatus +') from server. Please try again later!' );
						// window.location.reload(false);
						// return false;
					// },
					// success: function(x) {
						// var parser = new DOMParser(),
							// doc = parser.parseFromString(x, "text/html"),
							// $wholePage = $("<div>").html(x),
							// imgs = $wholePage.find('#main').find('img');
// 
							// data['doc_title'] = $wholePage.find('title').html();
							// data['main_content'] = $wholePage.find('#main').html();
							// data['body_classes'] = doc.body.getAttribute('class');
// 
							// var dynamicScripts = $wholePage.find('script');
							// var dynamicStyle = $wholePage.find('link[rel*="stylesheet"]');
// 							
							// if ( $(dynamicScripts).length ) {
								// var scriptLinks = {};
								// $(dynamicScripts).each( function(i) {
									// var _scriptcontent = ( typeof $(this).attr('src') !== 'undefined' ? $(this).attr('src') : $(this).html() ),
										// _scriptid = ( typeof $(this).attr('src') !== 'undefined' ? 'src_'+i : 'content_'+i );
									// scriptLinks[_scriptid] = _scriptcontent;
								// });
								// data['embeded_scripts'] = scriptLinks;
							// }
// 
							// if ( $(dynamicStyle).length ) {
								// $(dynamicStyle).each(function(){
									// var hrf = $(this).attr('href');
									// if ( $('link[href*="'+hrf+'"]').length < 1 ) {
										// $('head').append($(this));
									// }
								// });
							// }
// 
							// $('title').html( data['doc_title'] );
							// history.pushState(data, data['doc_title'], dest_url );
// 
							// requestAnimationFrame( function() {
								// d.pageTransit();
							// });
// 
							// d.$win.one('braynReadyForNewPage', function() {
								// $(window).scrollTop(0);
								// $('#site').removeAttr('style');
								// $('body').removeAttr('style').attr('class', data.body_classes );
								// $('#main').removeAttr('style').html(data.main_content);
// 
								// if ( imgs.length ) {
									// d.loadAllImages( imgs );
// 
									// d.$win.one('braynImagesLoaded', function() {
										// // apply the scripts, incase any special script for different pages
										// d.injectSscripts( dynamicScripts );
// 
										// // unlock. allow for another ajax
										// d.onAjaxProgress = false;
// 
										// // need this? not sure.. just tryin to free up the cache
										// parser = doc = $wholePage = imgs = null;
									// });
								// } else {
// 
									// // apply the scripts, incase any special script for different pages
									// d.injectSscripts( dynamicScripts );
// 
									// // unlock. allow for another ajax
									// d.onAjaxProgress = false;
// 
									// // need this? not sure.. just tryin to free up the cache
									// parser = doc = $wholePage = imgs = null;
								// }
							// });
					// },
				// });
			// });
		// },

		loadAllImages: function( imgs ) {
			var d=this, c=document.createDocumentFragment(), tracker=[];

			for (var i = imgs.length-1; i >= 0; i--) {
				var im = new Image();
				im.onload = function () {
					tracker.push(im);
					if ( tracker.length >= imgs.length ) {
						
						if ( $('.portfolio-grid-lists').length ) {
							$('.portfolio-grid-lists').find('.image-shadow').each(function(v){
								var c=this,
									data = {
										el: c,
										image: c.querySelector("img"),
										id: v
									};
								d.canvasBlur(data);
							});
						}
						$(window).trigger('braynImagesLoaded');
					}
				};
				im.onerror = function () {
					tracker.push(im);
					if ( tracker.length >= imgs.length ) {
						$(window).trigger('braynImagesLoaded');
					}
				};
				im.src = $(imgs[i]).attr('src');
				c.appendChild(im);
			}
		},

		getBlurryStorage: function(){
			var d=this;
			d.blurryImage = JSON.parse(localStorage.blurryImage || null) || {};
			return d.blurryImage;
		},

		saveBlurryStorage: function( url, data ) {
			var d=this;
			d.blurryImage[url] = data;
			// saveData.foo = foo;
			d.blurryImage.time = new Date().getTime();
			localStorage.blurryImage = JSON.stringify(d.blurryImage);
		},

		canvasBlur: function(data) {
			var d=this, f=document.createDocumentFragment(), Filters = {};
			var mul_table = [512,512,456,512,328,456,335,512,405,328,271,456,388,335,292,512,
			        454,405,364,328,298,271,496,456,420,388,360,335,312,292,273,512,
			        482,454,428,405,383,364,345,328,312,298,284,271,259,496,475,456,
			        437,420,404,388,374,360,347,335,323,312,302,292,282,273,265,512,
			        497,482,468,454,441,428,417,405,394,383,373,364,354,345,337,328,
			        320,312,305,298,291,284,278,271,265,259,507,496,485,475,465,456,
			        446,437,428,420,412,404,396,388,381,374,367,360,354,347,341,335,
			        329,323,318,312,307,302,297,292,287,282,278,273,269,265,261,512,
			        505,497,489,482,475,468,461,454,447,441,435,428,422,417,411,405,
			        399,394,389,383,378,373,368,364,359,354,350,345,341,337,332,328,
			        324,320,316,312,309,305,301,298,294,291,287,284,281,278,274,271,
			        268,265,262,259,257,507,501,496,491,485,480,475,470,465,460,456,
			        451,446,442,437,433,428,424,420,416,412,408,404,400,396,392,388,
			        385,381,377,374,370,367,363,360,357,354,350,347,344,341,338,335,
			        332,329,326,323,320,318,315,312,310,307,304,302,299,297,294,292,
			        289,287,285,282,280,278,275,273,271,269,267,265,263,261,259];
			        
			   
			var shg_table = [9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17, 
			        17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 
			        19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
			        20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
			        21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
			        21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 
			        22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
			        22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23, 
			        23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
			        23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
			        23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 
			        23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 
			        24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
			        24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
			        24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
			        24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24 ];
			
			Filters.getPixels = function(img, el) {
				var c,ctx;
				if (img.getContext) {
					c = img;
					try { 
						ctx = c.getContext('2d'); 
					} catch(e) {}
				}
				if (!ctx) {
					c = this.getCanvas($(el).width(), $(el).height());
					ctx = c.getContext('2d');
					ctx.clearRect( 0, 0, c.width, c.height );
					ctx.fillStyle= '#fff';
					ctx.globalAlpha = 0.94;
					ctx.fillRect(0,0,c.width, c.height);
					
					ctx.drawImage(img, 30, 30, c.width-60, ((c.width-60)/c.width)*c.height);
				}
				return ctx.getImageData(0,0,c.width,c.height);
			};

			Filters.getCanvas = function(w,h) {
				var c = document.createElement('canvas');
				c.width = w;
				c.height = h;
				return c;
			};

			function stackBlurCanvasRGBA( c, top_x, top_y, width, height, radius ) {
			    if ( isNaN(radius) || radius < 1 ) return;
			    radius |= 0;
			    
			    var canvas  = c;
			    var context = canvas.getContext("2d");
			    var imageData;
			    
			    try {
			      try {
			        imageData = context.getImageData( top_x, top_y, width, height );
			      } catch(e) {
			      
			        // NOTE: this part is supposedly only needed if you want to work with local files
			        // so it might be okay to remove the whole try/catch block and just use
			        // imageData = context.getImageData( top_x, top_y, width, height );
			        try {
			            netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
			            imageData = context.getImageData( top_x, top_y, width, height );
			        } catch(e) {
			            alert("Cannot access local image");
			            throw new Error("unable to access local image data: " + e);
			            return;
			        }
			      }
			    } catch(e) {
			      alert("Cannot access image");
			      throw new Error("unable to access image data: " + e);
			    }
			            
			    var pixels = imageData.data;

			    var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum, a_sum, 
			    r_out_sum, g_out_sum, b_out_sum, a_out_sum,
			    r_in_sum, g_in_sum, b_in_sum, a_in_sum, 
			    pr, pg, pb, pa, rbs;
			            
			    var div = radius + radius + 1;
			    var w4 = width << 2;
			    var widthMinus1  = width - 1;
			    var heightMinus1 = height - 1;
			    var radiusPlus1  = radius + 1;
			    var sumFactor = radiusPlus1 * ( radiusPlus1 + 1 ) / 2;
			    
			    var stackStart = new BlurStack();
			    var stack = stackStart;
			    for ( i = 1; i < div; i++ )
			    {
			        stack = stack.next = new BlurStack();
			        if ( i == radiusPlus1 ) var stackEnd = stack;
			    }
			    stack.next = stackStart;
			    var stackIn = null;
			    var stackOut = null;
			    
			    yw = yi = 0;
			    
			    var mul_sum = mul_table[radius];
			    var shg_sum = shg_table[radius];
			    
			    for ( y = 0; y < height; y++ )
			    {
			        r_in_sum = g_in_sum = b_in_sum = a_in_sum = r_sum = g_sum = b_sum = a_sum = 0;
			        
			        r_out_sum = radiusPlus1 * ( pr = pixels[yi] );
			        g_out_sum = radiusPlus1 * ( pg = pixels[yi+1] );
			        b_out_sum = radiusPlus1 * ( pb = pixels[yi+2] );
			        a_out_sum = radiusPlus1 * ( pa = pixels[yi+3] );
			        
			        r_sum += sumFactor * pr;
			        g_sum += sumFactor * pg;
			        b_sum += sumFactor * pb;
			        a_sum += sumFactor * pa;
			        
			        stack = stackStart;
			        
			        for( i = 0; i < radiusPlus1; i++ )
			        {
			            stack.r = pr;
			            stack.g = pg;
			            stack.b = pb;
			            stack.a = pa;
			            stack = stack.next;
			        }
			        
			        for( i = 1; i < radiusPlus1; i++ )
			        {
			            p = yi + (( widthMinus1 < i ? widthMinus1 : i ) << 2 );
			            r_sum += ( stack.r = ( pr = pixels[p])) * ( rbs = radiusPlus1 - i );
			            g_sum += ( stack.g = ( pg = pixels[p+1])) * rbs;
			            b_sum += ( stack.b = ( pb = pixels[p+2])) * rbs;
			            a_sum += ( stack.a = ( pa = pixels[p+3])) * rbs;
			            
			            r_in_sum += pr;
			            g_in_sum += pg;
			            b_in_sum += pb;
			            a_in_sum += pa;
			            
			            stack = stack.next;
			        }
			        
			        
			        stackIn = stackStart;
			        stackOut = stackEnd;
			        for ( x = 0; x < width; x++ )
			        {
			            pixels[yi+3] = pa = (a_sum * mul_sum) >> shg_sum;
			            if ( pa != 0 )
			            {
			                pa = 255 / pa;
			                pixels[yi]   = ((r_sum * mul_sum) >> shg_sum) * pa;
			                pixels[yi+1] = ((g_sum * mul_sum) >> shg_sum) * pa;
			                pixels[yi+2] = ((b_sum * mul_sum) >> shg_sum) * pa;
			            } else {
			                pixels[yi] = pixels[yi+1] = pixels[yi+2] = 0;
			            }
			            
			            r_sum -= r_out_sum;
			            g_sum -= g_out_sum;
			            b_sum -= b_out_sum;
			            a_sum -= a_out_sum;
			            
			            r_out_sum -= stackIn.r;
			            g_out_sum -= stackIn.g;
			            b_out_sum -= stackIn.b;
			            a_out_sum -= stackIn.a;
			            
			            p =  ( yw + ( ( p = x + radius + 1 ) < widthMinus1 ? p : widthMinus1 ) ) << 2;
			            
			            r_in_sum += ( stackIn.r = pixels[p]);
			            g_in_sum += ( stackIn.g = pixels[p+1]);
			            b_in_sum += ( stackIn.b = pixels[p+2]);
			            a_in_sum += ( stackIn.a = pixels[p+3]);
			            
			            r_sum += r_in_sum;
			            g_sum += g_in_sum;
			            b_sum += b_in_sum;
			            a_sum += a_in_sum;
			            
			            stackIn = stackIn.next;
			            
			            r_out_sum += ( pr = stackOut.r );
			            g_out_sum += ( pg = stackOut.g );
			            b_out_sum += ( pb = stackOut.b );
			            a_out_sum += ( pa = stackOut.a );
			            
			            r_in_sum -= pr;
			            g_in_sum -= pg;
			            b_in_sum -= pb;
			            a_in_sum -= pa;
			            
			            stackOut = stackOut.next;

			            yi += 4;
			        }
			        yw += width;
			    }

			    
			    for ( x = 0; x < width; x++ )
			    {
			        g_in_sum = b_in_sum = a_in_sum = r_in_sum = g_sum = b_sum = a_sum = r_sum = 0;
			        
			        yi = x << 2;
			        r_out_sum = radiusPlus1 * ( pr = pixels[yi]);
			        g_out_sum = radiusPlus1 * ( pg = pixels[yi+1]);
			        b_out_sum = radiusPlus1 * ( pb = pixels[yi+2]);
			        a_out_sum = radiusPlus1 * ( pa = pixels[yi+3]);
			        
			        r_sum += sumFactor * pr;
			        g_sum += sumFactor * pg;
			        b_sum += sumFactor * pb;
			        a_sum += sumFactor * pa;
			        
			        stack = stackStart;
			        
			        for( i = 0; i < radiusPlus1; i++ )
			        {
			            stack.r = pr;
			            stack.g = pg;
			            stack.b = pb;
			            stack.a = pa;
			            stack = stack.next;
			        }
			        
			        yp = width;
			        
			        for( i = 1; i <= radius; i++ )
			        {
			            yi = ( yp + x ) << 2;
			            
			            r_sum += ( stack.r = ( pr = pixels[yi])) * ( rbs = radiusPlus1 - i );
			            g_sum += ( stack.g = ( pg = pixels[yi+1])) * rbs;
			            b_sum += ( stack.b = ( pb = pixels[yi+2])) * rbs;
			            a_sum += ( stack.a = ( pa = pixels[yi+3])) * rbs;
			           
			            r_in_sum += pr;
			            g_in_sum += pg;
			            b_in_sum += pb;
			            a_in_sum += pa;
			            
			            stack = stack.next;
			        
			            if( i < heightMinus1 )
			            {
			                yp += width;
			            }
			        }
			        
			        yi = x;
			        stackIn = stackStart;
			        stackOut = stackEnd;
			        for ( y = 0; y < height; y++ )
			        {
			            p = yi << 2;
			            pixels[p+3] = pa = (a_sum * mul_sum) >> shg_sum;
			            if ( pa > 0 )
			            {
			                pa = 255 / pa;
			                pixels[p]   = ((r_sum * mul_sum) >> shg_sum ) * pa;
			                pixels[p+1] = ((g_sum * mul_sum) >> shg_sum ) * pa;
			                pixels[p+2] = ((b_sum * mul_sum) >> shg_sum ) * pa;
			            } else {
			                pixels[p] = pixels[p+1] = pixels[p+2] = 0;
			            }
			            
			            r_sum -= r_out_sum;
			            g_sum -= g_out_sum;
			            b_sum -= b_out_sum;
			            a_sum -= a_out_sum;
			           
			            r_out_sum -= stackIn.r;
			            g_out_sum -= stackIn.g;
			            b_out_sum -= stackIn.b;
			            a_out_sum -= stackIn.a;
			            
			            p = ( x + (( ( p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1 ) * width )) << 2;
			            
			            r_sum += ( r_in_sum += ( stackIn.r = pixels[p]));
			            g_sum += ( g_in_sum += ( stackIn.g = pixels[p+1]));
			            b_sum += ( b_in_sum += ( stackIn.b = pixels[p+2]));
			            a_sum += ( a_in_sum += ( stackIn.a = pixels[p+3]));
			           
			            stackIn = stackIn.next;
			            
			            r_out_sum += ( pr = stackOut.r );
			            g_out_sum += ( pg = stackOut.g );
			            b_out_sum += ( pb = stackOut.b );
			            a_out_sum += ( pa = stackOut.a );
			            
			            r_in_sum -= pr;
			            g_in_sum -= pg;
			            b_in_sum -= pb;
			            a_in_sum -= pa;
			            
			            stackOut = stackOut.next;
			            
			            yi += width;
			        }
			    }

			    for (var q = 0, n = pixels.length; q < n; q += 4) {
			    	if ( pixels[q] == 255 && pixels[q+1] == 255 && pixels[q+2] == 255 ) {
			    		pixels[q+3] = 0;
			    	}
			    }

			    context.putImageData( imageData, top_x, top_y );
			}

			function BlurStack() {
				this.r = 0;
				this.g = 0;
				this.b = 0;
				this.a = 0;
				this.next = null;
			}

			function init( data ) {
				var osc = data.image.src,
					saved = d.getBlurryStorage();
				
				if ( saved.hasOwnProperty( osc ) ) {
					data.image.src = saved[osc];
					data.image.style.opacity = 0.75;
					return false;
				}

				var idata = Filters.getPixels(data.image, data.el);
				var c=document.createElement('canvas');
				c.width = idata.width;
				c.height = idata.height;
				c.id = 'customcvs'+data.id;
				f.appendChild(c);
				var ctx = c.getContext('2d');
				ctx.clearRect(0,0,idata.width,idata.height);
				ctx.putImageData(idata, 0, 0);

				stackBlurCanvasRGBA(c, 0, 0, idata.width, idata.height, 72);
				var dataURL = c.toDataURL('image/png');
				// save to localStorage
				d.saveBlurryStorage( osc, dataURL );
				
				data.image.src = dataURL;
				data.image.style.opacity = 0.75;
				
				c = ctx = dataURL = osc = null;
			}

			return init(data);
		},

		/**
		 * The animation before call the new page
		 * @since 1.0.0
		 */
		shrinkContent: function() {
			var d=this, $body = $('body'), $site = $("#site"), tempScrollTop = d.$win.scrollTop(), $header = $('#main-header'),
				shr = anime.timeline({
					autoplay: true,
					complete: function() {
						$(window).trigger('braynCanvasReady');
						$body = $site = tempScrollTop =  $header = null;
					},
				});

			if ( !d.menuShowed && $header.hasClass('shrink') ) {
				$header.addClass('keepshrink');
			}

			$site.css({
				position: 'fixed',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				overflow: 'hidden',
				webkitBoxShadow: '0 0 100px rgba(0,0,0, .12)',
				boxShadow: '0 0 100px rgba(0,0,0, .12)',
			}).scrollTop(tempScrollTop);

			if ( /iPad|iPhone|iPod|Android/.test(navigator.userAgent) || $('html').hasClass('default-scroll') ) {
				var scrollTarget = document.getElementById('scroll-viewport');
				document.querySelector('.viewport').style.position = 'fixed';
				scrollTarget.style.msTransform = 'matrix(1, 0, 0, 1, 0, '+(-tempScrollTop)+')';
				scrollTarget.style.webkitTransform = 'matrix(1, 0, 0, 1, 0, '+(-tempScrollTop)+')';
				scrollTarget.style.transform = 'matrix(1, 0, 0, 1, 0, '+(-tempScrollTop)+')';
			}			

			shr.add({
				targets: '#site',
				scale: 0.9,
				translateY: (d.$win.width()*0.05)-(d.$win.height()*0.05),
				duration: 500,
				easing: 'easeInOutCirc',
			});
		},

		pageTransit: function() {
			var d=this,roler=document.getElementById('transit_roler');

			if ( ! roler ) {
				var c = document.createDocumentFragment(), 
					divroler = document.createElement('div');

				divroler.id = 'transit_roler';

				c.appendChild(divroler);
				divroler.innerHTML = '<div class="trl"></div><div class="trr"></div><div class="trload"></div>';

				document.body.appendChild(c);

				roler = document.getElementById('transit_roler');
			}
			$(roler).css({
				position: 'fixed',
				zIndex: 102,
				left: 0,
				right: 0,
				bottom: 0,
				top: 0,
				width: '100%',
				height: 0,
				overflow: ''
			});
			$(roler).find('.trl, .trr').css({
				position: 'fixed',
				zIndex: 103,
				width: '51%',
				height: 0,
				top: 'initial',
				bottom: 0,
				left: 0,
				willChange: 'height',
				backgroundColor: braynOptions.transitDiv_bg
			});
			$(roler).find('.trr').css({
				left: 'initial',
				right: 0
			});
			
			$(roler).find('.trload').css({
				position: 'fixed',
				opacity: 0,
				zIndex: 104,
				width: '50px',
				height: '50px',
				top: '50%',
				left: '50%',
				marginTop: '-25px',
				marginLeft: '-25px',
				'-webkit-border-radius': '50%',
				borderRadius: '50%',
				backgroundColor: 'transparent',
				border: '3px solid #989898',
				borderBottom: '3px solid rgba(0,0,0,0)',
				borderLeft: '3px solid rgba(0,0,0,0)',
				'animation-name': 'rotateAnimation',
				'-webkit-animation-name': 'wk-rotateAnimation',
				'animation-duration': '1s',
				'-webkit-animation-duration': '1s',
				'animation-delay': '0.2s',
				'-webkit-animation-delay': '0.2s',
				'animation-iteration-count': 'infinite',
				'-webkit-animation-iteration-count': 'infinite'
			});
			
			anime({
				targets: ['#transit_roler .trl', '#transit_roler .trr'],
				height: ['0%','100%'],
				duration: 500,
				easing: 'easeInOutCirc',
				delay: function(el, i, l) { return i * 100; },
				complete: function() {
					$('#transit_roler').find('.trload').css({opacity: 1});
					$('#transit_roler').find('.trl, .trr').css({
						top: '0',
						bottom: 'initial',
					});
					$('#main-header').removeClass('keepshrink').css({top: ''});
					$('.header--complementary').find('.button').removeClass('button-reverse');

					if ( d.menuShowed ) {
						// close the menu
						$('button.hamburger__menu').trigger('click');
						// run the Ajax after 500 ms
						d.$win.one('braynMenuClosedForAjax', function() {
							$(window).trigger('braynReadyForNewPage');
						});
					} else {
						$(window).trigger('braynReadyForNewPage');
					}
				}
			});
		},

		injectSscripts: function(scripts) {
			var d=this;
			if( typeof scripts !== 'undefined' ) {
				var scriptDiv = document.getElementById('brayn-mo-script'), c=document.createDocumentFragment();
				
				if ( $('#brayn-mo-script').length < 1 ) {
					$('body').append($(scriptDiv));
					$('#brayn-mo-script').css({width:0,height:0,overflow:'hidden'});
				} else {
					$('#brayn-mo-script').html('');
				}

				if ( scriptDiv ) {
					scriptDiv.innerHTML = "";
				} else {
					var nd = document.createElement('div');
					nd.id = 'brayn-mo-script';
					c.appendChild(nd);
					document.body.appendChild(c);

					scriptDiv = document.getElementById('brayn-mo-script');
					scriptDiv.style.width = 0;
					scriptDiv.style.height = 0;
					scriptDiv.style.overflow = 'hidden';
				}

				$('style[id*="jarallax-clip"]').detach().remove();
				$('script').each(function() {
					var js__src = ( typeof $(this).attr('src') !== 'undefined' ? $(this).attr('src') : '' );
					if ( js__src.indexOf('assets/js/jquery.min.js') == -1 && js__src.indexOf('assets/js/app.js') == -1 && js__src.indexOf('assets/js/plugins.js') == -1 ) {
						$(this).detach().remove();
					}
				});

				$(scripts).each(function() {
					var x=this, _src = $(this).attr('src');

					if ( typeof _src === 'undefined' ) {
						var content = $(this).html();

						// manually fixing some custom script,
						// incase they call the function inside document ready.
						content = $.trim(content);
						content = content.replace('jQuery(document).ready', 'jQuery(window).load');
						content = content.replace('$(document).ready', 'jQuery(window).load');
						$(x).html(content);
						$(scriptDiv).append($(x));

					} else {
					
						if ( $('script[src="'+_src+'"]').length < 1 && _src.indexOf('assets/js/brayn-firstload.js') == -1 ) {
							$.cachedScript( _src ).done( function( script, textStatus ) {});
						}
					}
				});

				d.parallaxInit();
				d.getHeaderSize();
				window.requestTimeout(function(){
					$('#transit_roler').find('.trload').css({opacity: 0});
					anime({
						targets: ['#transit_roler .trl', '#transit_roler .trr'],
						height: ['100%','0%'],
						duration: 500,
						delay: function(el, i, l) { return i * 200; },
						easing: 'easeInOutCirc',
						complete: function() {
							$('#transit_roler').css({height: 0, overflow: 'hidden'});
							$(window).trigger('load');
							$(window).trigger('braynHasFinishLoad');
						}
					});
				},500);
			}
		},

		getHeaderSize: function() {
			var d=this, $header = $('#main-header'), hs=false;
			if ( d.getter ) {
				window.clearRequestTimeout( d.getter );
			}

			if ( $header.hasClass('shrink') ) {
				hs=true;
			}

			d.getterProcess = true;
			$header.removeClass('shrink').removeAttr('style');
			$header.find('.brand--nav').removeAttr('style');

			d.getter = window.requestTimeout(function(){
				d.headerSize = {
					width: d.$win.width(),
					height: $header.height(),
					logoWidth: $('.brand').find('img').width(),
				}
				$('.ui-menu-container').css({paddingTop: d.headerSize.height+'px' });
				if ( $('#brayn-section-hero').length < 1 && $('header.page-header').length < 1 && $('.single-portfolio-header').length < 1 && $('#top-map').length < 1 ) {
					if ( ! $('#main').find('.br-section:first-child').hasClass('br-min-height__100vh') )	{
						$('#main').css({paddingTop: d.headerSize.height+'px'});
					}
					$('.header--complementary').find('.button').addClass('button-reverse');
				} else if ( $('#brayn-section-hero').length < 1 && $('header.page-header').length > 0 ) {
					$('header.page-header').css({paddingTop: d.headerSize.height+'px'});
				}
				d.getterProcess = false;
				if ( hs ) {
					hs=false;
					d.shrinkHeader();
				}
			},500);
		},

		shrinkHeader: function() {
			var d=this, oAnimate = false, $header = $('#main-header');

			// size is unknown, leave it for now.
			if ( typeof d.headerSize.height === 'undefined' || d.getterProcess || $header.hasClass('keepshrink') ) {
				return false;
			}

			if ( d.$win.scrollTop() > d.headerSize.height ) {
				oAnimate = true;
				$header.find('.brand--nav').css({width: d.headerSize.logoWidth+60+54+'px'});
				$header.addClass('shrink');
				oAnimate = false;
			} else if ( d.$win.scrollTop() < 5 ) {	
				if ( $header.hasClass('shrink') && ! oAnimate ) {
					oAnimate = true;
					$header.find('.brand--nav').css({width: '50%'});
					requestTimeout(function() {
						oAnimate = false;
						$header.removeClass('shrink');
						$header.find('.brand--nav').css({width: ''});
					}, 500);
				}
			}
		},

		/**
		 * Check the link,
		 * if local means support for ajax transition page
		 *
		 * @version 1.0.0
		 */
		linkisLocal: function(el) {
			var d=this;
			if( window.location.hostname === el.hostname || !el.hostname.length ) {
				// Check more for other cases
				if ( d.linkDeniedUseAjax(el) ) {
					return false;
				}
				return true;
			}

			return false;
		},

		/**
		 * Check the link,
		 * reject if link for mailto/tel, or link to image/video/text file
		 *
		 * @version 1.0.0
		 */
		linkDeniedUseAjax: function(el) {
			el = el.href;

			if ( el.indexOf('mailto:') !== -1 || el.indexOf('tel:') !== -1 ) {
				return true;
			}

			el = el.split('?')[0];
			var parts = el.split('.'),
				extension = parts[parts.length-1],
				fileTypes = ['jpg','jpeg','tiff','png','gif','bmp','mp4','mp3','mov','txt','doc'];

			// if link is point to image/video files, reject it.
			if( fileTypes.indexOf(extension) !== -1 ) {
				return true;
			}

			return false;
		},

		menuListener: function() {
			var d=this, btn = $('button.hamburger__menu'), $header = $('#main-header'), html = document.documentElement, body = document.body;

			d.addMenuArrows();
			if ( $('.main-menu-widgets').is(':hidden') === false && $('.menu-widget-image').length ) {
				if ( $('.menu-widget-image').find('canvas').length < 1 ) {
					new pSlideCanvas( $('.menu-widget-image')[0], $('.menu-widget-image')[0], 'hide', 'assets/images/clouds-s.jpg', {width: $('.menu-widget-image').width(), height: $('.menu-widget-image').height()} );
				}
			}

			btn.unbind().on( 'click', function(e) {
				e.preventDefault();
				var oSt = window.pageYOffset || html.scrollTop || body.scrollTop || 0;

				if ( d.onMenuShow ) {
					return false;
				}

				d.onMenuShow = true;

				if ( btn.hasClass('is-active') ) {
					btn.removeClass('is-active');
					var menuHide = anime.timeline({
						autoplay: true,
						complete: function() {
							d.onMenuShow = false;
							$('.main-menu-container-wrap, .menu-widget').removeAttr('style');
							$('.menu-widget-image').parent().removeClass('done-it');
							$('.menu-widget-image').find('img').removeAttr('style');
							d.shrinkHeader();
							d.menuShowed = false;
							
							d.$win.on('scroll', function() {
								d.shrinkHeader();
								d.watchPortfolioGridItems();
							});

							$(window).trigger('braynMenuClosedForAjax');
						}
					});

					$('.main-menu-container-wrap').css({
						top: 0,
						bottom: 'initial'
					});
					menuHide.add({
						targets: ['#brayn-menu > .menu-item', '.menu-widget'],
						opacity: [1,0],
						translateY: [0, -100],
						delay: function(el, i, l) { return i * 50; },
						easing: 'easeInOutSine',
						duration: ( d.onAjaxProgress ? 50 : 800 ),
						complete: function() {
							$header.removeClass('on_menu');
						}
					}).add({
						targets: '.main-menu-container-wrap',
						height: ['100%', '0%'],
						opacity: [1,0],
						easing: 'easeInOutCirc',
						duration: ( d.onAjaxProgress ? 50 : 600 ),
						offset: '-=200',
					});
				} else {
					btn.addClass('is-active');
					var menuShow = anime.timeline({
						autoplay: true,
						complete: function() {
							$header.addClass('on_menu');
							if ( $header.hasClass('shrink') ) {
								$header.find('.brand--nav').css({width: '50%'});
								window.requestTimeout(function(){
									$header.removeClass('shrink');
									$header.find('.brand--nav').css({width: ''});
									d.onMenuShow = false;
								},500);
							} else {
								d.onMenuShow = false;
							}
							d.menuShowed = true;
						}
					});
					
					$('body').css({pointerEvents: 'none'});
					d.$win.off('scroll');
					
					menuShow.add({
						targets: '.main-menu-container-wrap',
						height: ['0%', '100%'],
						opacity: [0, 1],
						easing: 'easeInOutCirc',
						duration: 600,
						complete: function() {
							var mwi = $('.menu-widget-image');

							if ( mwi.length && typeof window.appear !== 'undefined' ) {
								var mwiAppear = new window.appear({
									elements: function elements() {
										return document.getElementsByClassName('menu-widget-image');
									},
									appear: function appear(el) {
										$(el).trigger('customShowCanvas');
										$(el).parent().addClass('done-it');
									},
									bounds: 0
								});
							}

							if ( /iPad|iPhone|iPod/.test(navigator.userAgent) ) {
								$('.main-menu-container-wrap').find('a').on('touchstart', function(e){
									e.preventDefault();
									$(this).trigger('click');
									$(this).trigger('click');
									return true;
								});
							}
						}
					}).add({
						targets: ['#brayn-menu > .menu-item', '.menu-widget > h4', '.menu-widget-list > li'],
						opacity: [0,1],
						translateY: [50, 0],
						delay: function(el, i, l) { return i * 50; },
						easing: 'easeOutSine',
						duration: 600,
						offset: "-=50",
						complete: function() {
							$('body').css({ pointerEvents: '' });
						}
					});
				}

			});

			var menuScroll = window.Scrollbar,
				menuEl = document.querySelector('.main-menu-container'),
				scrollEm;
			scrollEm = menuScroll.init( menuEl );
			scrollEm.scrollTop = 0;
		},

		/**
		 * Add arrow to menu item that have child
		 * @ver 1.0
		 */
		addMenuArrows: function() {
			var d=this, $master=$('#brayn-menu'), $childs=$master.find('ul.sub-menu');

			if ( $childs.length ) {
				$childs.each(function() {
					var z=$(this).parent(),arrow='<span class="arrow-yuk-down"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 294.1L383 167c9.4-9.4 24.6-9.4 33.9 0s9.3 24.6 0 34L273 345c-9.1 9.1-23.7 9.3-33.1.7L95 201.1c-4.7-4.7-7-10.9-7-17s2.3-12.3 7-17c9.4-9.4 24.6-9.4 33.9 0l127.1 127z"/></svg></span>';
					$(this).hide();
					if ( $(z).find('>.arrow-yuk-down').length < 1 ) {
						$(arrow).insertAfter( $(z).find('>a') );
					} else {
						if ( $(z).find('>.arrow-yuk-down').hasClass('rtt') ) {
							$(z).find('>.arrow-yuk-down').removeClass('rtt');
						}
					}
				});
			}

			$('.arrow-yuk-down').each(function() {
				var ayd = this;
				$(ayd).off().on('click', function(e) {
					e.preventDefault();
					if ( ! $(this).hasClass('rtt') ) {
						$(ayd).parent('li').find('>ul').slideDown(200);
						$(this).addClass('rtt');
					} else {
						$(ayd).parent('li').find('>ul').slideUp(200);
						$(this).removeClass('rtt');
					}
				});
			});
		},

		/**
		 * Parallax & hero helper
		 * @ver 1.0
		 */
		parallaxInit: function() {
			var d=this, $hero = $('.hero-bg'), $singleHeader = $('.portfolio-header-bg');

			// Read the current hero.
			if ( $hero.length ) {
				var ef = $hero.data('effect'), c = document.createDocumentFragment();

				// if set to video bg
				if ( typeof ef !== 'undefined' && ef === "video" ) {
					var tk = $hero.find('#br-video-bg');
					// cannot find the container bg, reject
					if ( tk.length < 1 ) {
						tk = null;
						return false;
					}

					var params = {
						vtype: $(tk).data('video-type'),
						videoID: $(tk).data('video-id'),
						img: $(tk).data('img-fallback'),
					};

					// if iPad/iPhone/iPhone/Android based browser is detected
					if ( /iPad|iPhone|iPod|Android/.test(navigator.userAgent) ) {
						var img = new Image();
						c.appendChild(img);
						img.src = params.img;
						img.setAttribute('data-render', 'assets/images/clouds.jpg');

						document.querySelector(".hero-bg").appendChild(c);
						ef = 'parallax';
						$(tk).detach();
						tk = null;
					} else {

						// process the bg based on data setting
						switch( params.vtype ) {
							case 'vimeo':
								var ifrm = document.createElement('iframe');
								ifrm.src = '//player.vimeo.com/video/'+params.videoID+'?muted=1&autoplay=1&loop=1&autopause=0&byline=0&title=0&fun=0&dnt=1';
								ifrm.width = '100%';
								ifrm.height = '100%';
								ifrm.setAttribute('webkitallowfullscreen', 'true');
								ifrm.setAttribute('mozallowfullscreen', 'true');
								ifrm.setAttribute('allowfullscreen', 'true');
								c.appendChild(ifrm);
								document.querySelector("#br-video-bg").appendChild(c);
								break;
							case 'youtube':
							default:
								$(tk).YTPlayer({
									fitToBackground: true,
									videoId: params.videoID,
									start: 5,
									playerVars: {
										modestbranding: 0,
										autoplay: 1,
										controls: 0,
										showinfo: 0,
										wmode: 'transparent',
										branding: 0,
										rel: 0,
										autohide: 0,
										origin: window.location.origin
									}
								});
								break;
						}

						d.$win.one('braynHasFinishLoad', function() {
							window.requestTimeout(function(){
								requestAnimationFrame(function(){
									anime({
										targets: '#brayn-section-hero .wip--container > *',
										translateY: [50, 0],
										opacity: [0,1],
										delay: function(e, i, l) { return i * 100; },
										duration: 600,
										easing: 'easeInOutSine',
										complete: function() {
											anime({
												targets: '#brayn-section-hero .br-scroll-me',
												translateY: [50, 0],
												opacity: [0,1],
												rotate: ['-90deg', '-90deg'],
												duration: 600,
												easing: 'easeInOutSine',
											});
										}
									});
								});
							}, 1000);
						});
					}
				}

				if ( typeof ef !== 'undefined' && ( ef === 'parallax' || ef === 'single-image' ) ) {
					$hero.find('img').addClass('jarallax-img');

					window.brayn.heroRipple.start( $hero[0], $hero.find('img').attr('src'), $hero.find('img').data('render'), function() {
						anime({
							targets: '#brayn-section-hero .wip--container > *',
							translateY: [50, 0],
							opacity: [0,1],
							delay: function(e, i, l) { return i * 100; },
							duration: 600,
							easing: 'easeInOutSine',
							complete: function() {
								anime({
									targets: '#brayn-section-hero .br-scroll-me',
									translateY: [50, 0],
									opacity: [0,1],
									rotate: ['-90deg', '-90deg'],
									duration: 600,
									easing: 'easeInOutSine',
								});
							}
						});
						if ( ef === 'parallax' ) {
							$hero.braynrallax();
						} else {
							$hero.braynrallax();
						}
					});
				}
			}

			if ( $singleHeader.length ) {
				$singleHeader.find('img').addClass('jarallax-img');
				$singleHeader.braynrallax();

				anime({
					targets: '.portfolio-header-bg',
					opacity: [0,1],
					scale: [1.1, 1],
					duration: 1000,
					easing: 'easeInOutSine',
					delay: 800,
					complete: function() {
						$singleHeader.removeAttr('style').css({opacity: 1});
					}
				});	
			}
		},

		funcCaller: function() {
			var d=this, $portoCarousel = $('.portfolio-carousel-contain');

			// portfolio carousel
			if ( $portoCarousel.length > 0 ) {
				var portfolioSwiper = new Swiper('.portfolio-carousel-contain', {
					slidesPerView: 1,
					spaceBetween: 20,
					grabCursor: true,
					navigation: {
						nextEl: '.portfolio-carousel-btn-next',
						prevEl: '.portfolio-carousel-btn-prev',
					},
					breakpointsInverse: true,
					breakpoints: {
						768: {
							slidesPerView: 2,
							spaceBetween: 30
						},
						992: {
							slidesPerView: 3,
							spaceBetween: 40
						}
					},
					on: {
						init: function() {
							if ( /iPad|iPhone|iPod|Android/.test(navigator.userAgent) ) {
								$portoCarousel.find('img').css({opacity:1});
								$portoCarousel.find('.portfolio-carousel-item').addClass('is-touch')
							} else {
								$portoCarousel.find('.portfolio-carousel-img').each(function(){
									var src = $(this).find('img').attr('src'),
										dl = $('<div class="dl" />'),
										dr = $('<div class="dr" />');

									$(this).append(dl).append(dr);
									$(dl).css({backgroundImage: 'url('+src+')'});
									$(dr).css({backgroundImage: 'url('+src+')'});

									src = dl = dr = null;
								});
							}
						},
					}
				}), $pcitem = $('.portfolio-carousel-item');

				$pcitem.on('mouseover', function() {
					var k=this;
					$pcitem.not(k).css({opacity: .5});
				}).on('mouseleave', function() {
					$pcitem.css({opacity: ''});
				});
			}

			// Testimonial carousel
			if ( $('.testimonial-carousel-contain').length ) {
				var testiSwiper = new Swiper ('.testimonial-carousel-contain', {
					slidesPerView: 1,
					spaceBetween: 0,
					grabCursor: false,
					navigation: {
						nextEl: '.testimonial-carousel-btn-next',
						prevEl: '.testimonial-carousel-btn-prev',
					},
					speed: 800,
					effect: 'fade',
					fadeEffect: {
						crossFade: true,
					},
					autoplay: {
						delay: 5000,
						disableOnInteraction: false,
					},
					on: {
						init: function() {
							var $slideTotal = $('.testimonial-carousel-contain').find('.br-testimonial').length,
								$markup = $('<div class="total-slide"><span class="slide-current">01</span>/<span class="slide-total">0'+$slideTotal+'</span></div>');

							$markup.insertAfter( $('.testimonial-carousel-btn-prev') );
							$slideTotal = $markup = null;
						},
						slideChange: function() {
							var crt = "0"+(testiSwiper.activeIndex+1);
							$('.testimonial-carousel-contain').find('.slide-current').html(crt);
							crt = null;
						},
					}
				});
			}

			// Client slide/carousel
			if ( $('.client-carousel-contain').length ) {
				var clientSwiper = new Swiper ('.client-carousel-contain', {
					slidesPerView: 2,
					spaceBetween: 20,
					grabCursor: true,
					breakpointsInverse: true,
					breakpoints: {
						768: {
							slidesPerView: 3,
						},
						992: {
							slidesPerView: 4,
						}
					},
					speed: 500,
					loop: true,
					autoplay: {
						delay: 5000,
						disableOnInteraction: false,
					},
				});				
			}

			// Portfolio gallery carousel
			if ( $('.br-carousel-gallery-container').length ) {
				$('.br-carousel-gallery-container').find('.br-carousel-item').each(function() {
					var _src = $(this).find('img').attr('src'),
						bg = $(this).find('.br-carousel-bg');
					bg[0].style.backgroundImage = 'url("'+_src+'")';
				});
				var interleaveOffset = 0.5,
					pcSlideTotal = $('.br-carousel-gallery-container').find('.br-carousel-item').length;
				var pCarouselSwiper = new Swiper ('.br-carousel-gallery-container', {
					loop: true,
					slidesPerView: 1,
					spaceBetween: 0,
					grabCursor: true,
					watchSlidesProgress: true,
					navigation: {
						nextEl: '.br-gallery-carousel-btn-next',
						prevEl: '.br-gallery-carousel-btn-prev',
					},
					speed: 700,
					autoplay: {
						delay: 5000,
						disableOnInteraction: false,
					},
					// modify the effect of Swiper transition
					// source : https://codepen.io/udovichenko/pen/LGeQae
					on: {
						init: function() {
							var $markup = $('<div class="total-slide"><span class="slide-current">01</span>/<span class="slide-total">0'+pcSlideTotal+'</span></div>');

							$markup.insertAfter( $('.br-gallery-carousel-btn-prev') );
							$markup = null;
						},
						slideChange: function() {
							var swiper = this,
								crt = "0"+(swiper.realIndex+1);
							$('.br-carousel-gallery-container').find('.slide-current').html(crt);
							crt = null;
						},
						progress: function() {
							var swiper = this;
							for (var i = 0; i < swiper.slides.length; i++) {
								var slideProgress = swiper.slides[i].progress;
								var innerOffset = swiper.width * interleaveOffset;
								var innerTranslate = slideProgress * innerOffset;
								swiper.slides[i].querySelector(".br-carousel-bg").style.webkitTransform = "translate3d(" + innerTranslate + "px, 0, 0)";
								swiper.slides[i].querySelector(".br-carousel-bg").style.transform = "translate3d(" + innerTranslate + "px, 0, 0)";
							}      
						},
						touchStart: function() {
							var swiper = this;
							for (var i = 0; i < swiper.slides.length; i++) {
								swiper.slides[i].style.transition = "";
							}
						},
						setTransition: function(speed) {
							var swiper = this;
							for (var i = 0; i < swiper.slides.length; i++) {
								swiper.slides[i].style.webkitTransition = speed + "ms";
								swiper.slides[i].style.transition = speed + "ms";
								swiper.slides[i].querySelector(".br-carousel-bg").style.webkitTransition = speed + "ms";
								swiper.slides[i].querySelector(".br-carousel-bg").style.transition = speed + "ms";
							}
						}
					}
				});
			}

			// Portfolio grid helper
			if ( $('.portfolio-grid-lists').length && /iPad|iPhone|iPod|Android/.test(navigator.userAgent) === false ) {
				if ( typeof VanillaTilt !== "undefined" ) {
					VanillaTilt.init(document.querySelectorAll(".entry-image"),{
						max:15,
						speed:600,
						scale: 1.05,
						easing: 'cubic-bezier(0,0.29,0.58,1)'
					});
				}

				var flyingPorto = new window.appear({
					elements: function elements() {
						return document.getElementsByClassName('portfolio-grid-item');
					},
					appear: function appear(el) {
						$(el).addClass('onAppear');
					},
					disappear: function disappear(el) {
						$(el).removeClass('onAppear');
					},
					reappear: function reappear(el) {
						$(el).addClass('onAppear');
					},
					bounds: 0
				});

			}

			// circle progress
			d.circleProgress();

			// masonry init
			d.masonryInit();

			// Lightbox
			d.magnificPopupInit();

			d.floatEdgeMedia();

			d.contactFormInit();

			d.teamProfileInit();
		},

		teamProfileInit: function() {
			var d=this;

			$('.team-card').each(function() {
				if ( /iPad|iPhone|iPod|Android/.test(navigator.userAgent) === false ) {
					$(this).addClass('untouched');
				} else {
					$(this).removeClass('untouched');
				}
			});
		},

		contactFormInit: function() {
			var d=this, form=$('.contact-form');

			if ( form.length ) {
				form.each( function() {
					var f=this;

					$(f).find('input:not([type="submit"])').each(function() {
						var ip=this;

						( $(ip).val() !== "" ) && $(ip).addClass('has_value');

						$(ip).on('blur', function() {
							( $(ip).val() !== "" ) ? $(ip).addClass('has_value') : $(ip).removeClass('has_value');
						});
					});
				});
			}
		},

		floatEdgeMedia: function() {
			var d=this, lft=$('.container').offset().left, pl= parseFloat($('.container').css('padding-left'));

			$('.br-float-right-edge').each(function() {
				var _x=this,w;
				$(_x).removeAttr('style');
				w = $(_x).width();
				_x.style.width = (w+lft+pl)+'px';
				_x.style.position = 'relative';
				_x.style.marginRight = ((lft+pl)*-1)+'px';
			});

			$('.br-float-left-edge').each(function() {
				var _x=this,w;
				$(_x).removeAttr('style');
				w = $(_x).width();
				_x.style.width = (w+lft+pl)+'px';
				_x.style.position = 'relative';
				_x.style.marginLeft = ((lft+pl)*-1)+'px';
			});
		},

		animatedNumber: function(el) {
			var d=this, fnlObj, fnl=$(el).data('final-number'), drt=(typeof $(el).data('duration') === 'undefined') ? 1500 : $(el).data('duration');

			if ( typeof fnl === 'undefined' ) {
				return false;
			}
			fnlObj = {progress: 0};
			anime({
				targets: fnlObj,
				progress: [0, fnl],
				duration: Math.round(drt),
				easing: 'easeInSine',
				update: function() {
					$(el).html( Math.round(fnlObj.progress).toLocaleString() );
				}
			});
		},

		magnificPopupInit: function() {
			var d=this;

			if ( $('.br-gallery').length ) {
				$('.br-gallery').each(function(z) {
					var f=this, gal=false;
					if ( $(f).find('a').length ) {
						$(f).find('a').each( function(i, el) {
							var href_value = el.href;
							if (/\.(jpg|jpeg|png|gif)$/.test(href_value)) {
								gal=true;
							}
						});

						if ( gal ) {
							$(f).magnificPopup({
								delegate: 'a',
								type: 'image',
								removalDelay: 300,
								mainClass: 'mfp-fade',
								gallery:{
									enabled:true
								}
							});
						}
					}
				});
			}
		},


		/**
		 * Circular progress helper
		 *
		 * @since 1.0.0
		 */
		circleProgress: function() {
			var d=this;

			$('.br-circle-progress').each(function() {
				var _x=this, r= 0,
					c = document.createDocumentFragment(),
					data = $(_x).data('progress');

				var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
					circ = document.createElementNS("http://www.w3.org/2000/svg", "circle"),
					circBG = document.createElementNS("http://www.w3.org/2000/svg", "circle"),
					progText = document.createElementNS("http://www.w3.org/2000/svg", "text");
				svg.setAttribute( 'viewBox', '0 0 250 250');
				svg.setAttribute( 'width', '250');
				svg.setAttribute( 'height', '250');
				c.appendChild(svg);
				svg.appendChild(circBG);
				svg.appendChild(circ);
				svg.appendChild(progText);

				circ.setAttribute( 'class', 'circ-to-progress' );
				circ.setAttribute( 'fill', 'none' );
				circ.setAttribute( 'stroke', data['color'] );
				circ.setAttribute( 'cx', '125' );
				circ.setAttribute( 'cy', '125' );

				circBG.setAttribute( 'fill', 'none' );
				circBG.setAttribute( 'stroke', data['background'] );
				circBG.setAttribute( 'cx', '125' );
				circBG.setAttribute( 'cy', '125' );

				progText.setAttribute('x', '50%');
				progText.setAttribute('y', '50%');
				progText.setAttribute('dominant-baseline', 'middle');
				progText.setAttribute('text-anchor', 'middle');

				progText.innerHTML = data.percent;

				r = (250/2)-(30/2);
				circ.setAttribute( 'r', r );
				circ.setAttribute( 'stroke-width', '30');
				circ.setAttribute( 'opacity', '0');

				circBG.setAttribute( 'r', r );
				circBG.setAttribute( 'stroke-width', '30');

				switch( data.size ) {
					case 'small':
						svg.setAttribute( 'class', 'svg-circle small' );
						break;
					case 'big':
						svg.setAttribute( 'class', 'svg-circle big' );
						break;
					case 'medium':
					default:
						svg.setAttribute( 'class', 'svg-circle medium' );
						break;
				}
				circ.setAttribute('stroke-dashoffset',(2*Math.PI*r)*(1-(parseInt(data.percent)/100)));
				circ.setAttribute('stroke-dasharray', 2*Math.PI*r );
				circ.setAttribute('transform', 'rotate(-90, 125, 125)');
				
				_x.appendChild(c);
			});
		},

		masonryInit: function() {
			var d=this, masonGallery, metroGallery;

			if ( $('.br-masonry-gallery').length ) {
				var grids = $('.masonry-grid')
				masonGallery = grids.masonry({
					itemSelector: '.masonry-grid-item',
					columnWidth: '.masonry__sizer',
					percentPosition: true,
					transitionDuration: '0.3s',
					gutter: 0,
				});

				masonGallery.masonry().masonry('layout');
			}

			if ( $('.br-metro-gallery').length ) {
				var mGrids = $('.metro-grid')
				metroGallery = mGrids.masonry({
					itemSelector: '.metro-grid-item',
					columnWidth: '.metro__sizer',
					percentPosition: true,
					transitionDuration: '0.3s',
					gutter: 0,
				});

				metroGallery.masonry().masonry('layout');
			}
		},

		watchPortfolioGridItems: function() {
			var d=this,curScroll=d.$win.scrollTop();

			if ( $('.portfolio-grid-lists').length ) {
				$('.onAppear').each(function() {
					var _x=this, move = 0;
					if ( !$(_x).hasClass('onAppear') ) {
						return;
					}

					var intercept = curScroll-d.$win.height();
					var followScroll = ( $(_x).find('.portfolio-grid-obj').css('transform') !== 'none' ) ? true : false;

					if ( curScroll > d.origScroll ) {
						move = followScroll ? intercept/75 : (intercept/75)*-1;
					} else {
						move = followScroll ? (intercept/75)*-1 : intercept/75;
					}
					$(_x).css({
						'will-change' : 'transform',
						'-webkit-backface-visibility' : 'hidden',
						'perspective' : '1000px',
						'-webkit-transform': 'translate3d(0, '+move+'px, 0)',
						transform: 'translate3d(0, '+move+'px, 0)',
					});
				});
			}
			d.origScroll = curScroll;
		},

		customPointerInit: function() {
			var d=this;

			// If feature is disabled OR we on a touch enable device, stop it.
			if ( ! $('body').hasClass('custom-pointer') || ('ontouchstart' in document.documentElement) ) {
				return false;
			}

			var cp = $('<canvas id="brayn-custom-pointer" width="50" height="50"></canvas>');
			$('body').append(cp);
			var c = document.getElementById("brayn-custom-pointer");
			var ctx = c.getContext("2d");
			ctx.beginPath();
			ctx.arc(25, 25, 20, 0, 2 * Math.PI, true);
			ctx.strokeStyle = "rgba(0,0,0, .65)";
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(25, 25, 21, 0, 2 * Math.PI, true);
			ctx.strokeStyle = "rgba(255,255,255, .65)";
			ctx.stroke();
			$('#brayn-custom-pointer').css({
				position: 'fixed',
				zIndex: 99,
				top: '0',
				left: '0',
				pointerEvents: 'none',
				mixBlendMode : 'screen'
			});

			d.attachPointerEvents();
		},

		attachPointerEvents: function() {
			var d=this;
			document.getElementsByTagName("body")[0].addEventListener("mousemove", function(e) {
				var locX = e.clientX-25,
					locY = e.clientY-25;

				document.getElementById("brayn-custom-pointer").style.webkitTransform = 'translate3D('+locX+'px, '+locY+'px, 0)';
				document.getElementById("brayn-custom-pointer").style.mozTransform = 'translate3D('+locX+'px, '+locY+'px, 0)';
				document.getElementById("brayn-custom-pointer").style.transform = 'translate3D('+locX+'px, '+locY+'px, 0)';
			});
		},

		prettyReveal: function() {
			var d=this,
				fbi=$('.full-img-block'),
				ef=$('.has-reveal-effect'),
				circProg = $('.br-circle-progress');

			if ( circProg.length && typeof window.appear !== 'undefined' ) {
				var circularAppear = new window.appear({
					elements: function elements() {
						return document.getElementsByClassName('svg-circle');
					},
					appear: function appear(el,i) {
						if ( $(el).hasClass('done-animate') ) {
							return;
						}

						$(el).addClass( 'done-animate' );
						var cAnim, cDash = $(el).find('.circ-to-progress').attr('stroke-dashoffset'),
							cDarray = $(el).find('.circ-to-progress').attr('stroke-dasharray'),
							cProg = $(el).find('text').html(),
							cProgdata = { progress: 0 };
						
						cAnim = anime.timeline({
							autoplay: true,
						});
						$(el).find('.circ-to-progress').attr('stroke-dashoffset', cDarray).attr('opacity', 1);
						$(el).find('text').html('');
						cAnim.add({
							targets: $(el).find('.circ-to-progress')[0],
							strokeDashoffset: [cDarray, cDash],
							duration: 1200,
							delay: 100,
							easing: 'easeInOutCirc'
						}).add({
							targets: cProgdata,
							progress: cProg,
							duration: 1200,
							delay: 100,
							easing: 'easeInOutSine',
							update: function() {
								$(el).find('text').html( Math.round(cProgdata.progress)+'%');
							}
						}, '-=1200');
					},
					bounds: 0
				});
			}

			if ( $('.br-animated-number').length && typeof window.appear !== 'undefined' ) {
				var animNumberReveal = new window.appear({
					elements: function elements() {
						return document.getElementsByClassName('br-animated-number');
					},
					appear: function appear(el,i) {
						if ( $(el).hasClass('done-animate') ) {
							return;
						}

						$(el).addClass( 'done-animate' );
						
						// animated number
						d.animatedNumber( el );

					},
					bounds: 0
				}); 
			}

			if ( fbi.length && typeof window.appear !== 'undefined' ) {
				var fbiAppear = new window.appear({
					elements: function elements() {
						return document.getElementsByClassName('full-img-block');
					},
					appear: function appear(el) {
						if ( $(el).hasClass('done-animate') ) {
							return;
						}

						$(el).addClass( 'done-animate' );
						new pSlideCanvas( el, el, 'appear', 'assets/images/clouds.jpg', {width: $(el).width(), height: $(el).height()} );
					},
					bounds: 0
				});
			}

			if ( ef.length && typeof window.appear !== 'undefined' ) {
				var globReveal = new window.appear({
					elements: function elements() {
						return document.getElementsByClassName('has-reveal-effect');
					},
					appear: function appear(el, dly) {
						if ( $(el).hasClass('done-animate') ) {
							return;
						}

						var effect = $(el).data('effect');
						if ( typeof effect === 'undefined' ) {
							// default
							effect = 'fadeInTop';
						}

						$(el).addClass( 'done-animate' );

						switch( effect ) {
							case 'revealRight':
								$(el).css({opacity:1});
								var rx = $('<span class="revealer" />');
								$(el).addClass('revealOnProc').append( rx );
								rx.css({
									left: 0,
									top: 0,
									width: 0,
								});
								anime({
									targets: $(rx)[0],
									width: ['0%', '100%'],
									duration: 300,
									easing: 'easeInOutCirc',
									complete: function() {
										$(rx).css({
											left : 'initial',
											right: 0,
										});
										$(el).removeClass('revealOnProc');

										anime({
											targets: $(rx)[0],
											width: 0,
											duration: 300,
											easing: 'easeInOutCirc',
											delay: 200,
											complete: function() {
												$(el).removeClass('has-reveal-effect').css({opacity: '', transform: '', '-webkit-transform': ''});
												$(rx).remove();	
											}
										});
									},
									delay: function(el) { return dly * 50; },
								});
								break;
							case 'revealLeft':
								$(el).css({opacity:1});
								var rx = $('<span class="revealer" />');
								$(el).addClass('revealOnProc').append( rx );
								rx.css({
									right: 0,
									top: 0,
									width: 0,
								});
								anime({
									targets: $(rx)[0],
									width: ['0%', '100%'],
									duration: 300,
									easing: 'easeInOutCirc',
									complete: function() {
										$(rx).css({
											right : 'initial',
											left: 0,
										});
										$(el).removeClass('revealOnProc');

										anime({
											targets: $(rx)[0],
											width: 0,
											duration: 300,
											easing: 'easeInOutCirc',
											delay: 200,
											complete: function() {
												$(el).removeClass('has-reveal-effect').css({opacity: '', transform: '', '-webkit-transform': ''});
												$(rx).remove();	
											}
										});
									},
									delay: function(el) { return dly * 50; },
								});
								break;
							case 'revealTop':
								$(el).css({opacity:1});
								var rx = $('<span class="revealer" />');
								$(el).addClass('revealOnProc').append( rx );
								rx.css({
									right: 0,
									left: 0,
									bottom: 0,
									height: 0,
								});
								anime({
									targets: $(rx)[0],
									height: ['0%', '100%'],
									duration: 300,
									easing: 'easeInOutCirc',
									complete: function() {
										$(rx).css({
											bottom : 'initial',
											top: 0,
										});
										$(el).removeClass('revealOnProc');

										anime({
											targets: $(rx)[0],
											height: 0,
											duration: 300,
											easing: 'easeInOutCirc',
											delay: 200,
											complete: function() {
												$(el).removeClass('has-reveal-effect').css({opacity: '', transform: '', '-webkit-transform': ''});
												$(rx).remove();	
											}
										});
									},
									delay: function(el) { return dly * 50; },
								});
								break;
							case 'revealBottom':
								$(el).css({opacity:1});
								var rx = $('<span class="revealer" />');
								$(el).addClass('revealOnProc').append( rx );
								rx.css({
									right: 0,
									left: 0,
									top: 0,
									height: 0,
								});
								anime({
									targets: $(rx)[0],
									height: ['0%', '100%'],
									duration: 300,
									easing: 'easeInOutCirc',
									complete: function() {
										$(rx).css({
											top : 'initial',
											bottom: 0,
										});
										$(el).removeClass('revealOnProc');

										anime({
											targets: $(rx)[0],
											height: 0,
											duration: 300,
											easing: 'easeInOutCirc',
											delay: 200,
											complete: function() {
												$(el).removeClass('has-reveal-effect').css({opacity: '', transform: '', '-webkit-transform': ''});
												$(rx).remove();	
											}
										});
									},
									delay: function(el) { return dly * 50; },
								});
								break;
							case 'fadeIn':
								anime({
									targets: el,
									opacity: [0,1],
									duration: 500,
									easing: 'easeInOutSine',
									complete: function() {
										$(el).removeClass('has-reveal-effect').css({opacity: '', transform: '', '-webkit-transform': ''});
									},
									delay: function(el) { return dly * 50; },
								});
								break;
							case 'fadeInLeft':
								anime({
									targets: el,
									opacity: [0,1],
									translateX: [75, 0],
									duration: 500,
									easing: 'easeInOutSine',
									complete: function() {
										$(el).removeClass('has-reveal-effect').css({opacity: '', transform: '', '-webkit-transform': ''});
									},
									delay: function(el) { return dly * 50; },
								});
								break;
							case 'fadeInRight':
								anime({
									targets: el,
									opacity: [0,1],
									translateX: [-75, 0],
									duration: 500,
									easing: 'easeInOutSine',
									complete: function() {
										$(el).removeClass('has-reveal-effect').css({opacity: '', transform: '', '-webkit-transform': ''});
									},
									delay: function(el) { return dly * 50; },
								});
								break;
							case 'zoomIn':
								$(el).css({opacity:1,transform: 'scale(0)','-webkit-transform': 'scale(0)'});
								anime({
									targets: el,
									scale: [0, 1],
									duration: 500,
									easing: 'easeInOutSine',
									complete: function() {
										$(el).removeClass('has-reveal-effect').css({opacity: '', transform: '', '-webkit-transform': ''});
									},
									delay: function(el) { return dly * 50; },
								});
								break;
							case 'fadeInBottom':
								anime({
									targets: el,
									opacity: [0,1],
									translateY: [-75, 0],
									duration: 500,
									easing: 'easeInOutQuad',
									complete: function() {
										$(el).removeClass('has-reveal-effect').css({opacity: '', transform: '', '-webkit-transform': ''});
									},
									delay: function(el) { return dly * 50; },
								});
								break;
							case 'fadeInTop':
							default:
								anime({
									targets: el,
									opacity: [0,1],
									translateY: [100, 0],
									duration: 500,
									easing: 'easeInOutQuad',
									complete: function() {
										$(el).removeClass('has-reveal-effect').css({opacity: '', transform: '', '-webkit-transform': ''});
									},
									delay: function(el) { return dly * 50; },
								});
								break;
						}
					},
					bounds: -50
				});
			}
		},

		// Process contact form
		processContactForm: function() {
			var d=this, $form=$('#brayn-contact-form'), onSend = false;

			$form.on('submit', function(e) {
				e.preventDefault();

				if ( onSend ) {
					return false;
				}

				if ( $form.find('textarea[name="message"]').val() === "" ) {
					$form.find('textarea[name="message"]').focus().addClass('border-danger');
					return false;
				}

				$form.find('.border-danger').removeClass('border-danger');
				$form.find('button.submit').addClass('on-submit');
				onSend = true;

				var from_data = $form.serialize();

				$.ajax({
					url  : $form.attr('action'),
					type : 'post',
					data : from_data,
					dataType : 'json',
					success: function( cb ) {
						$form.find('.cf-message').html('<div class="alert alert-success">'+ cb.messages +'</div>');
						$(window).scrollTop( $form.offset().top-100 );
						$form.trigger('reset');
						$form.find('input').blur();
						$form.find('button.submit').removeClass('on-submit');
						window.setTimeout(function() {
							$form.find('.cf-message').find('.alert').animate({
								opacity : 0
							}, 300, function() {
								$form.find('.cf-message').html('');
								onSend = false;
							});
						}, 3000);
					},
					error: function( cb ) {
						var err = JSON.parse( cb.responseText );

						$form.find('.cf-message').html('<div class="alert alert-danger">'+ err.messages +'</div>');
						$(window).scrollTop( $form.offset().top-100 );
						$form.find('button.submit').removeClass('on-submit');
						window.setTimeout(function() {
							$form.find('.cf-message').find('.alert').animate({
								opacity : 0
							}, 300, function() {
								$form.find('.cf-message').html('');
								onSend = false
							});
						}, 3000);
					}
				});

			});
		},

		// Remove the firsttime preloader
		removeLoader: function() {
			var d=this;

			if ( $('.portfolio-grid-lists').length ) {
				$('.portfolio-grid-lists').find('.image-shadow').each(function(v){
					var c=this,
						data = {
							el: c,
							image: c.querySelector("img"),
							id: v
						};
					d.canvasBlur(data);
				});
			}
			$(window).scrollTop(0);

			requestAnimationFrame(function(){
				if ( $('#brayn-first-load').length ) {

					$('#main-header').css({
						'-webkit-transform' : 'translateY(-300px)',
						'transform' : 'translateY(-300px)',
					});
					anime({
						targets: '#brayn-first-load',
						opacity: 0,
						duration: 800,
						easing: 'easeOutSine',
						complete: function() {
							$(window).trigger('braynHasFinishLoad');
							$('#brayn-first-load').detach();
							anime({
								targets: '#main-header',
								translateY: [-300, 0],
								duration: 600,
								easing: 'easeInSine',
								complete: function() {
									$('#main-header').removeAttr('style');
								}
							});
						},
					});
				} else {
					window.requestTimeout(function(){
						$(window).trigger('braynHasFinishLoad');
					},300);
				}
			});
		},
	};
	z.init();
	return z;
}( window.jQuery );
