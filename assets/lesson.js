(function(){
  // Fullscreen
  window.toggleFullscreen = function(){
    if(!document.fullscreenElement){
      document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(()=>{});
    } else {
      document.exitFullscreen && document.exitFullscreen();
    }
  };
  document.addEventListener('fullscreenchange', ()=>{
    const btn = document.getElementById('btn-fs');
    if(btn) btn.textContent = document.fullscreenElement ? '⛶ 退出全屏' : '⛶ 全屏';
  });

  // Edge-hover sidebars
  const body = document.body;
  const leftbar = document.getElementById('leftbar');
  const rightbar = document.getElementById('rightbar');
  const edgeL = document.getElementById('edge-left');
  const edgeR = document.getElementById('edge-right');
  let hideL, hideR;
  function show(side){ clearTimeout(side==='left'?hideL:hideR); body.classList.add('show-'+side); }
  function scheduleHide(side){
    if (body.classList.contains('touch-mode')) return; // 触屏由按钮显式开合，不自动收回
    const ref = side==='left' ? (t)=>hideL=t : (t)=>hideR=t;
    clearTimeout(side==='left'?hideL:hideR);
    ref(setTimeout(()=>body.classList.remove('show-'+side), 220));
  }
  if(edgeL && leftbar){
    [[edgeL,leftbar,'left'],[edgeR,rightbar,'right']].forEach(([edge,bar,side])=>{
      if(!edge||!bar) return;
      edge.addEventListener('mouseenter', ()=>show(side));
      edge.addEventListener('mouseleave', ()=>scheduleHide(side));
      bar.addEventListener('mouseenter', ()=>show(side));
      bar.addEventListener('mouseleave', ()=>scheduleHide(side));
    });
    document.addEventListener('mousemove', (e)=>{
      const x = e.clientX, w = window.innerWidth;
      if (x <= 12) show('left'); else if (x > 40 && leftbar && !leftbar.matches(':hover')) scheduleHide('left');
      if (edgeR && rightbar){
        if (x >= w - 12) show('right'); else if (x < w - 40 && !rightbar.matches(':hover')) scheduleHide('right');
      }
    }, {passive:true});
  }

  // Question popovers
  window.closeAllPops = function(except){
    document.querySelectorAll('.popover.open').forEach(p => { if(p!==except) p.classList.remove('open'); });
  };
  window.togglePop = function(btn){
    const pop = btn.parentElement.querySelector('.popover');
    if(!pop) return;
    const willOpen = !pop.classList.contains('open');
    closeAllPops(pop);
    pop.classList.toggle('open', willOpen);
  };
  window.closePop = function(x){ const p=x.closest('.popover'); if(p) p.classList.remove('open'); };
  document.addEventListener('click', (e)=>{
    if(!e.target.closest('.anchor') && !e.target.closest('[data-qa-link]')) closeAllPops();
  });

  window.flashTag = function(i){
    const tags = document.querySelectorAll('.q-tag');
    if(tags[i]){ tags[i].scrollIntoView({behavior:'smooth', block:'center'}); tags[i].style.transform='scale(1.2)'; setTimeout(()=>tags[i].style.transform='', 450); tags[i].focus && tags[i].focus(); }
  };

  // 数据驱动的疑问标签：notes/*.json → sync_qa.py 生成，按 id 定位
  window.flashQA = function(id){
    const tag = document.querySelector('[data-qa-id="'+id+'"]');
    if(!tag) return;
    // 标签若在未展开的揭示块里，先把块展开，否则滚动过去也看不见
    const rev = tag.closest('.reveal');
    if(rev && !rev.classList.contains('shown')) rev.classList.add('shown');
    const stg = tag.closest('.stage');
    if(stg && /^stage-\d+$/.test(stg.id)) window.markChain(parseInt(stg.id.slice(6), 10));
    tag.scrollIntoView({behavior:'smooth', block:'center'});
    const pop = tag.parentElement && tag.parentElement.querySelector('.popover');
    if(pop){ closeAllPops(pop); pop.classList.add('open'); }
    tag.style.transform='scale(1.2)';
    setTimeout(()=>{ tag.style.transform=''; }, 450);
  };

  // Scrollspy
  const tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  const sections = Array.from(tocLinks).map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if(sections.length){
    window.addEventListener('scroll', () => {
      let current = sections[0];
      sections.forEach(sec => { if (sec.getBoundingClientRect().top <= 90) current = sec; });
      tocLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + (current && current.id)));
    }, {passive:true});
  }

  // Exercise checking (data-answer on container)
  const LS_KEY = (window.LESSON_ID ? 'hwxc_ex_'+window.LESSON_ID : null);
  function loadProg(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'{}'); }catch(e){return{};} }
  function saveProg(p){ if(LS_KEY) try{ localStorage.setItem(LS_KEY, JSON.stringify(p)); }catch(e){} }
  function updateProgUI(){
    const prog = loadProg();
    const qs = document.querySelectorAll('[data-qid]');
    let done=0; qs.forEach(q=>{ if(prog[q.dataset.qid]) done++; });
    const total = qs.length || 0;
    const bar = document.getElementById('ex-bar');
    const txt = document.getElementById('ex-text');
    if(bar) bar.style.width = (total? Math.round(done*100/total):0) + '%';
    if(txt) txt.textContent = `练习进度：${done} / ${total}`;
  }
  window.checkChoice = function(qid, correctVal){
    const box = document.querySelector('[data-qid="'+qid+'"]');
    if(!box) return;
    const sel = box.querySelector('input[type="radio"]:checked');
    const fb = box.querySelector('.fb');
    if(!sel){ if(fb){ fb.className='fb bad'; fb.textContent='请选择一个选项。'; } return; }
    const ok = sel.value === correctVal;
    if(fb){ fb.className = 'fb ' + (ok?'ok':'bad'); fb.textContent = ok ? ('正确：'+(box.dataset.explain||'')) : ('再想想：'+(box.dataset.hint||'')); }
    if(ok){ const p=loadProg(); p[qid]=true; saveProg(p); updateProgUI(); }
  };
  updateProgUI();

  // Ohm lab (if present)
  const vEl = document.getElementById('lab-v');
  const rEl = document.getElementById('lab-r');
  function fmtI(a){
    const ma=a*1000; if(Math.abs(ma)>=1000) return a.toFixed(3)+' A'; if(Math.abs(ma)>=1) return ma.toFixed(2)+' mA'; return (ma*1000).toFixed(1)+' μA';
  }
  function fmtR(ohm){ if(ohm>=1e6) return (ohm/1e6).toFixed(2)+' MΩ'; if(ohm>=1000) return (ohm/1000).toFixed(2)+' kΩ'; return ohm.toFixed(0)+' Ω'; }
  function fmtP(w){ if(w>=1) return w.toFixed(3)+' W'; if(w>=0.001) return (w*1000).toFixed(2)+' mW'; return (w*1e6).toFixed(1)+' μW'; }
  function updateLab(){
    if(!vEl||!rEl) return;
    const V = parseFloat(vEl.value), R = parseFloat(rEl.value);
    const I = R>0 ? V/R : 0; const P = V*I;
    const set=(id,val)=>{ const e=document.getElementById(id); if(e) e.textContent=val; };
    set('lab-v-val', V.toFixed(2)+' V');
    set('lab-r-val', fmtR(R));
    set('lab-i-val', fmtI(I));
    set('lab-p-val', fmtP(P));
    const warn = document.getElementById('lab-warn');
    if(warn){
      let msg=''; if(P>0.25) msg='提示：P > 0.25 W，常见 1/4W 电阻可能过热，需选更高额定功率并留裕量。';
      else if(P>0.125) msg='提示：P 接近/超过 0.125 W，对 1/8W 电阻已偏高，注意额定功率。';
      warn.style.display = msg? 'block':'none'; warn.textContent = msg;
    }
    const flow = document.getElementById('lab-flow');
    if(flow){
      flow.innerHTML='';
      const dots = Math.max(3, Math.min(14, Math.round(I*2000)+3));
      const speed = Math.max(0.25, Math.min(3, 0.8/(I*200+0.08)));
      for(let k=0;k<dots;k++){
        const d=document.createElement('span'); d.className='dot';
        d.style.left = (-k*(100/dots))+'%';
        d.style.animationDuration = speed+'s';
        d.style.animationDelay = (-k*speed/dots)+'s';
        flow.appendChild(d);
      }
    }
    const eq = document.getElementById('lab-eq');
    if(eq){ eq.textContent = `I = V/R = ${V.toFixed(2)} / ${R.toFixed(0)} = ${fmtI(I)} ；  P = V·I = ${fmtP(P)}`; }
  }
  if(vEl&&rEl){ vEl.addEventListener('input', updateLab); rEl.addEventListener('input', updateLab); updateLab(); }

  /* ===== v2 叙事组件（新增，旧页面无这些元素时完全不触发） ===== */
  window.markChain = function(n){
    document.querySelectorAll('.chain-node').forEach(function(el){
      var k = parseInt(el.dataset.stage || '0', 10);
      el.classList.toggle('done', k < n);
      el.classList.toggle('active', k === n);
    });
  };
  window.revealBlock = function(btn){
    var id = btn && btn.dataset.target;
    var box = id && document.getElementById(id);
    if(!box) return;
    box.classList.add('shown');
    if(btn){ btn.disabled = true; btn.textContent = '已展开 ✓'; }
    var st = parseInt((btn && btn.dataset.stage) || box.dataset.stage || '0', 10);
    if(!isNaN(st)) window.markChain(st);
    box.scrollIntoView({behavior:'smooth', block:'nearest'});
  };
  window.pickPred = function(el, val){
    var wrap = el.closest('.pred');
    if(!wrap) return;
    wrap.querySelectorAll('.pred-opt').forEach(function(b){ b.classList.remove('picked'); });
    el.classList.add('picked');
    wrap.dataset.pick = val;
    var go = wrap.querySelector('.reveal-btn');
    if(go) go.disabled = false;
  };
  window.checkNum = function(id, expected, tolerance){
    var box = document.getElementById(id);
    if(!box) return;
    var raw = (box.querySelector('input') || {}).value;
    var fb = box.querySelector('.fb');
    var v = parseFloat(raw);
    if(isNaN(v)){ if(fb){ fb.className='fb bad'; fb.textContent='先填一个数。'; } return; }
    var ok = Math.abs(v - expected) <= (tolerance || 0.01);
    if(fb){ fb.className = 'fb ' + (ok?'ok':'bad'); fb.textContent = ok ? '正确。' : ('再想想：注意参考方向与符号，正确答案是 ' + expected + '。'); }
    if(ok){ var p=loadProg(); p[id]=true; saveProg(p); updateProgUI(); }
  };
  window.resetFlow = function(){
    document.querySelectorAll('.reveal').forEach(function(b){ b.classList.remove('shown'); });
    document.querySelectorAll('.reveal-btn').forEach(function(b){ b.disabled=false; b.textContent = b.dataset.label || '继续 →'; });
    document.querySelectorAll('.pred-opt').forEach(function(b){ b.classList.remove('picked'); });
    document.querySelectorAll('.pred').forEach(function(b){ delete b.dataset.pick; });
    window.markChain(0);
  };
  document.querySelectorAll('.reveal-btn').forEach(function(b){ if(!b.dataset.label) b.dataset.label = b.textContent; });
  window.markChain(0);

  /* ===== 手机 / 触屏侧栏开关（新增，桌面行为不变） ===== */
  try {
    var touchMode = (window.matchMedia && (matchMedia('(hover: none)').matches || matchMedia('(pointer: coarse)').matches)) || window.innerWidth <= 860;
    if (touchMode) {
      body.classList.add('touch-mode');
      function makeToggle(side, label, aria){
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'nav-toggle ' + side;
        b.textContent = label;
        b.setAttribute('aria-label', aria);
        b.addEventListener('click', function(e){
          e.stopPropagation();
          var cls = 'show-' + side;
          var wasOpen = body.classList.contains(cls);
          body.classList.remove('show-left', 'show-right');
          if (!wasOpen) body.classList.add(cls);
        });
        document.body.appendChild(b);
      }
      makeToggle('left', '☰ 目录', '打开或关闭课程目录');
      if (rightbar) makeToggle('right', 'ⓘ 速查', '打开或关闭速查栏');
      document.addEventListener('click', function(e){
        if (!e.target.closest('.nav-toggle, .sidebar, .anchor, [data-qa-link]')) {
          body.classList.remove('show-left', 'show-right');
        }
      });
      document.querySelectorAll('.sidebar a').forEach(function(a){
        a.addEventListener('click', function(){ body.classList.remove('show-left','show-right'); });
      });
    }
  } catch(e) {}
})();