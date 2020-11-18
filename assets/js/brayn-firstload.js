(function() {
	"use strict";
	if ( typeof Pace === "object" ) {
		var braynRender = false;

		function scrollBy(el, distance, duration) {

		    var initialY = el.scrollTop;
		    var y = initialY + distance;
		    var baseY = (initialY + y) * 0.5;
		    var difference = initialY - baseY;
		    var startTime = performance.now();

		    function step() {
		        var normalizedTime = (performance.now() - startTime) / duration;
		        if (normalizedTime > 1) normalizedTime = 1;

		        //el.scrollTo(0, baseY + difference * Math.cos(normalizedTime * Math.PI));
		        el.scrollTop = baseY + difference * Math.cos(normalizedTime * Math.PI);
		        if (normalizedTime < 1) window.requestAnimationFrame(step);
		    }
		    window.requestAnimationFrame(step);
		}
		Pace.once("start", function(e){
			var prog = document.querySelector(".bfl-img-render"),stat = document.querySelector(".bfl-prog"),cprog = 0,progper = 0;
			if ( ! prog ) {
				return false;
			}
			braynRender = window.setInterval(function(){
				progper = parseInt(Pace.bar.progress);
				if ( progper > cprog ) {
					prog.style.width = (100-progper)+"%";

					for (var i = cprog+1; i <= progper; i++) {
						var c = document.createDocumentFragment(),
							d = document.createElement('div');

						c.appendChild(d);
						d.innerHTML = i;
						d.id = 'nmr'+i;
						stat.lastChild.className = 'kesundul';
						stat.appendChild(c);
						scrollBy(stat, i*60, 1000);

						c = d = null;
					}
					cprog = progper;
				}
			},5);
		});

		Pace.once("done", function(e){
			if ( braynRender ) {
				document.querySelector(".bfl-prog").innerHTML = "<div>100</div>";
				document.querySelector(".bfl-img-render").style.width = "0%";
				clearInterval(braynRender);
				setTimeout( function(){
					//window.dispatchEvent( new Event("braynHasDoneLoad") );
					jQuery(window).trigger('braynHasDoneLoad');
				},100);		
			} else {
				setTimeout( function(){
					//window.dispatchEvent( new Event("braynHasDoneLoad") );
					jQuery(window).trigger('braynHasDoneLoad');
				},100);
			}
		});
	}
})();