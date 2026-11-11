var LL=(()=>{var l0=Object.defineProperty;var I0=Object.getOwnPropertyDescriptor;var A0=Object.getOwnPropertyNames;var L0=Object.prototype.hasOwnProperty;var N0=(n,t)=>{for(var o in t)l0(n,o,{get:t[o],enumerable:!0})},Y0=(n,t,o,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of A0(t))!L0.call(n,s)&&s!==o&&l0(n,s,{get:()=>t[s],enumerable:!(r=I0(t,s))||r.enumerable});return n};var B0=n=>Y0(l0({},"__esModule",{value:!0}),n);var J0={};N0(J0,{DEFAULT_ASSUMPTIONS:()=>d0,FX:()=>P,FX_AS_OF:()=>g0,GST:()=>D0,JOURNEY_STAGES:()=>q,LENDERS:()=>U0,REPO:()=>G,REPO_AS_OF:()=>S0,REPO_NOW:()=>o0,SALARY_BENCHMARKS:()=>i0,SOURCES:()=>v0,SPOT:()=>z,UNIVERSITIES:()=>_0,computePlan:()=>n0,costFlows:()=>Z,findLender:()=>a0,findUniversity:()=>r0,firstYearInr:()=>m0,fxStats:()=>b0,indiaTaxNewRegime:()=>M0,inferStage:()=>p0,journey:()=>w0,searchUniversities:()=>C0,simulateRisk:()=>H0});function t0(n){let t=[],o=[],r="",s=!1;for(let c=0;c<n.length;c++){let l=n[c];s?l==='"'&&n[c+1]==='"'?(r+='"',c++):l==='"'?s=!1:r+=l:l==='"'?s=!0:l===","?(o.push(r),r=""):l===`
`?(o.push(r),t.push(o),o=[],r=""):l!=="\r"&&(r+=l)}(r||o.length)&&(o.push(r),t.push(o));let[U,...h]=t.filter(c=>c.length>1||c[0]);return h.map(c=>Object.fromEntries(U.map((l,I)=>[l,c[I]??""])))}function y0(n){let t=["USD","GBP","EUR","CAD","AUD"],o=t0(n.fx),r=Object.fromEntries(t.map(a=>[a,o.filter(g=>g[a]).map(g=>({month:g.month,v:Number(g[a])}))])),s=o[o.length-1].month,U=Object.fromEntries(t.map(a=>[a,r[a][r[a].length-1].v]));U.INR=1;let h=t0(n.repo).map(a=>({month:a.month,v:Number(a.repo)})),c=h[h.length-1].v,l=h[h.length-1].month,I=t0(n.lenders).map(a=>({...a,rate_min:Number(a.rate_min),rate_max:a.rate_max==="n/a"?null:Number(a.rate_max)})),p=t0(n.universities).map(a=>({...a,duration_months:Number(a.duration_months),tuition_total:Number(a.tuition_total),living_per_month:Number(a.living_per_month),tuition_inr_lakh:Number(a.tuition_inr_lakh),living_inr_lakh:Number(a.living_inr_lakh),total_today_inr_lakh:Number(a.total_today_inr_lakh),total_typical_fx_inr_lakh:Number(a.total_typical_fx_inr_lakh),total_bad_case_fx_inr_lakh:Number(a.total_bad_case_fx_inr_lakh)})),_=a=>String(a||"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\b(the|university|of|at|and)\b/g," ").replace(/\s+/g," ").trim();function d(a,g){let C=_(a),f=_(g);if(!C)return 0;if(f===C)return 100;if(f.includes(C)||C.includes(f))return 80;let S=C.split(" "),x=new Set(f.split(" ")),L=S.filter(u=>x.has(u)).length;return Math.round(L/Math.max(S.length,1)*60)}let M={"ut dallas":"University of Texas at Dallas",utd:"University of Texas at Dallas","ut austin":"University of Texas at Austin",uiuc:"University of Illinois Urbana-Champaign",cmu:"Carnegie Mellon",nyu:"New York University",usc:"University of Southern California",ucla:"University of California Los Angeles",ucsd:"University of California San Diego",uci:"University of California Irvine",ucsb:"University of California Santa Barbara",asu:"Arizona State","georgia tech":"Georgia Institute of Technology",gatech:"Georgia Institute of Technology",umd:"University of Maryland College Park",uic:"University of Illinois Chicago",ncsu:"North Carolina State",tamu:"Texas A&M",jhu:"Johns Hopkins",bu:"Boston University",ubc:"University of British Columbia",uoft:"University of Toronto",tum:"Technical University of Munich",kit:"Karlsruhe Institute of Technology",tcd:"Trinity College Dublin",ucd:"University College Dublin",ucl:"University College London",kcl:"King's College London",anu:"Australian National University",unimelb:"University of Melbourne","suny buffalo":"University at Buffalo","stony brook":"Stony Brook University"};function A(a,g){let C=M[String(a||"").toLowerCase().trim()];C&&(a=C);let f=null,S=0;for(let x of p){let L=d(a,x.university);g&&x.country.toLowerCase().startsWith(String(g).toLowerCase().slice(0,4))&&(L+=5),L>S&&(f=x,S=L)}return S>=45?f:null}function D({query:a="",country:g="",limit:C=15}={}){let f=p;return g&&(f=f.filter(S=>S.country.toLowerCase().includes(g.toLowerCase())||g.toUpperCase()==="US"&&S.country==="United States"||g.toUpperCase()==="UK"&&S.country==="United Kingdom")),a&&(f=f.map(S=>({u:S,s:d(a,S.university)})).filter(S=>S.s>=30).sort((S,x)=>x.s-S.s).map(S=>S.u)),f.slice(0,C)}function e(a){let g=null,C=0;for(let f of I){let S=Math.max(d(a,f.lender),d(a,f.lender.split(" ")[0])+(_(a).startsWith(_(f.lender.split(" ")[0]))?20:0));S>C&&(g=f,C=S)}return C>=45?g:null}function m(a,g){let C=r[a].filter(u=>u.month>="2000-01").map(u=>u.v),f=[];for(let u=0;u+g<C.length;u++)f.push(C[u+g]/C[u]-1);f.sort((u,v)=>u-v);let S=u=>f[Math.floor(u*(f.length-1))],x=C[C.length-1],L=u=>(x/C[C.length-1-12*u])**(1/u)-1;return{currency:a,horizon_months:g,windows:f.length,p10:S(.1),p50:S(.5),p90:S(.9),worst:f[f.length-1],prob_over_10pct:f.filter(u=>u>.1).length/f.length,cagr_10y:L(10),cagr_20y:L(20),spot:x,as_of:s}}let b=[{country:"United States",role:"Software engineer (H-1B LCA median, FY2025)",annual:127878,currency:"USD",source:"US DOL LCA disclosure data via careery.pro"}],i=[{name:"Exchange rates (monthly avg of daily)",detail:`US Federal Reserve H.10 / FRED, via datasets/exchange-rates. Jan 1999 to ${s}.`,url:"https://fred.stlouisfed.org/series/DEXINUS"},{name:"RBI repo rate",detail:`Every policy change since 2000, latest ${c}% (${l}).`,url:"https://www.rbi.org.in"},{name:"Lender rate cards",detail:"14 lenders, public rate cards as of 2026 (IvyEdge, Nomad Credit compilations).",url:"https://ivyedgesop.com/blogs/study-abroad-education-loan-india-2026"},{name:"University costs",detail:"97 CS master\u2019s programmes in 6 countries. Tuition from Yocket and university guides; living costs from official visa proof-of-funds rules.",url:"https://yocket.com/universities/top-universities-in-computer-science-for-masters"},{name:"Salary benchmark",detail:"US software engineer H-1B LCA median wage, FY2025 (US Department of Labor).",url:"https://careery.pro/h1b-sponsors/role/software-engineer"},{name:"Tax rules",detail:"Section 80E (old regime only, 8 years); TCS on education remittances (nil if loan-financed, 5% above \u20B910L if self-funded); 18% GST on loan fees.",url:"https://www.business-standard.com/amp/budget/news/tcs-on-foreign-remittances-up-to-rs-10-lakh-none-on-foreign-education-loan-125020100857_1.html"}];return{CURRENCIES:t,FX:r,FX_AS_OF:s,SPOT:U,REPO:h,REPO_NOW:c,REPO_AS_OF:l,LENDERS:I,UNIVERSITIES:p,findUniversity:A,searchUniversities:D,findLender:e,fxStats:m,SALARY_BENCHMARKS:b,SOURCES:i}}var h0={fx:`month,USD,GBP,EUR,CAD,AUD
1999-01,42.5453,70.1885,49.3143,28.0013,26.8885
1999-02,42.5316,69.2249,47.6469,28.3979,27.2160
1999-03,42.5161,68.9312,46.2826,28.0165,26.8204
1999-04,42.7968,68.8534,45.7942,28.7615,27.4757
1999-05,42.8590,69.2334,45.5585,29.3334,28.4061
1999-06,43.2127,68.9236,44.8430,29.4074,28.3596
1999-07,43.3567,68.2919,44.9628,29.1207,28.4486
1999-08,43.5032,69.8590,46.1349,29.1351,28.0396
1999-09,43.5981,70.8346,45.7668,29.5180,28.3149
1999-10,43.5527,72.1743,46.6256,29.4761,28.3506
1999-11,43.4580,70.4229,44.8831,29.6152,27.7625
1999-12,43.5239,70.2141,44.0040,29.5654,27.8972
2000-01,43.5895,71.5051,44.1607,30.0914,28.5958
2000-02,43.6540,69.8467,42.9277,30.0816,27.4042
2000-03,43.6383,68.9459,42.0821,29.8742,26.5922
2000-04,43.6847,69.1244,41.2783,29.7417,26.0371
2000-05,44.0759,66.5034,39.9332,29.4680,25.4902
2000-06,44.7605,67.5549,42.5436,30.3046,26.6298
2000-07,44.8405,67.6011,42.0874,30.3438,26.3213
2000-08,45.7687,68.1443,41.3965,30.8666,26.5835
2000-09,45.9680,65.8983,39.9674,30.9256,25.3783
2000-10,46.4252,67.3456,39.5766,30.6953,24.5090
2000-11,46.8214,66.7573,40.0390,30.3526,24.4318
2000-12,46.7845,68.4413,42.0266,30.7429,25.5702
2001-01,46.6138,68.8741,43.7059,31.0107,25.8807
2001-02,46.5616,67.6307,42.8601,30.6034,24.8514
2001-03,46.6532,67.3876,42.3733,29.9313,23.4707
2001-04,46.7886,67.1296,41.7589,30.0378,23.4700
2001-05,46.9473,66.9698,41.0930,30.4649,24.4071
2001-06,47.0424,65.9545,40.1250,30.8574,24.3696
2001-07,47.1781,66.7452,40.6435,30.8209,24.0081
2001-08,47.1665,67.7868,42.5142,30.6309,24.7425
2001-09,47.7511,69.9012,43.5264,30.4545,24.0451
2001-10,48.0514,69.6792,43.4866,30.5740,24.2284
2001-11,48.0430,68.9709,42.6749,30.1737,24.8156
2001-12,47.9345,69.0859,42.7170,30.3632,24.6301
2002-01,48.3533,69.2538,42.7032,30.2269,24.9996
2002-02,48.7168,69.3110,42.4179,30.5172,24.9803
2002-03,48.7667,69.3971,42.7507,30.7148,25.6296
2002-04,48.9386,70.6145,43.3597,30.9465,26.1939
2002-05,49.0168,71.5562,44.9465,31.6235,26.9508
2002-06,48.9840,72.6743,46.8347,31.9785,27.8307
2002-07,48.7877,75.9375,48.4723,31.5747,27.0192
2002-08,48.6150,74.7143,47.5487,30.9783,26.3166
2002-09,48.4625,75.4240,47.5240,30.7487,26.4837
2002-10,48.3882,75.3633,47.4760,30.6660,26.6248
2002-11,48.2853,75.8612,48.3478,30.7282,27.1005
2002-12,48.1495,76.3788,49.0821,30.8815,27.0798
2003-01,47.9571,77.5728,50.9413,31.1145,27.9536
2003-02,47.7474,76.7768,51.4940,31.5781,28.4366
2003-03,47.6767,75.4472,51.4788,32.3002,28.6773
2003-04,47.3909,74.5875,51.4777,32.5015,28.9062
2003-05,47.1100,76.4283,54.4360,34.0462,30.4691
2003-06,46.6995,77.5608,54.5189,34.5298,31.0654
2003-07,46.2200,74.9756,52.5297,33.4514,30.5399
2003-08,45.9557,73.2486,51.2662,32.9142,29.9523
2003-09,45.8467,74.0640,51.6545,33.6295,30.4195
2003-10,45.4036,76.2371,53.1840,34.3451,31.5461
2003-11,45.5544,76.9777,53.3480,34.6978,32.6074
2003-12,45.5741,79.8274,56.0466,34.7197,33.6822
2004-01,45.4560,82.9780,57.4483,35.0881,35.0790
2004-02,45.2726,84.5364,57.2266,34.0440,35.1756
2004-03,44.9693,82.1178,55.1381,33.8479,33.7100
2004-04,43.8918,79.1339,52.6216,32.7112,32.6649
2004-05,45.1755,80.6835,54.2100,32.7646,31.7952
2004-06,45.5027,83.1738,55.2671,33.5137,31.5627
2004-07,46.0557,84.9158,56.4898,34.8255,32.9813
2004-08,46.3220,84.3180,56.4730,35.2898,32.9376
2004-09,46.0548,82.6070,56.2967,35.7563,32.3668
2004-10,45.7355,82.6731,57.2005,36.6830,33.5559
2004-11,45.0325,83.7878,58.5265,37.6312,34.6914
2004-12,43.8470,84.5650,58.7803,35.9786,33.6501
2005-01,43.6150,81.9831,57.2335,35.6119,33.4451
2005-02,43.5758,82.2324,56.7047,35.1419,34.0429
2005-03,43.5861,83.0005,57.4662,35.8470,34.2040
2005-04,43.6419,82.7490,56.4867,35.3150,33.7719
2005-05,43.4095,80.5616,55.1159,34.5766,33.2658
2005-06,43.5245,79.1154,52.9053,35.0976,33.3691
2005-07,43.4340,76.0410,52.2963,35.5214,32.6796
2005-08,43.5500,78.1485,53.5455,36.1656,33.1584
2005-09,43.8462,79.2039,53.6412,37.2326,33.5475
2005-10,44.7575,79.0014,53.8088,38.0137,33.7212
2005-11,45.6315,79.1646,53.7911,38.6228,33.5529
2005-12,45.5633,79.5456,54.0401,39.2312,33.8264
2006-01,44.2010,78.1696,53.5946,38.1992,33.1726
2006-02,44.2300,77.3138,52.8088,38.4988,32.8079
2006-03,44.3378,77.3340,53.3313,38.3141,32.2127
2006-04,44.8245,79.2539,55.0154,39.1851,33.0309
2006-05,45.1959,84.4606,57.7051,40.7190,34.5221
2006-06,45.8886,84.5965,58.0971,41.2046,33.9507
2006-07,46.3675,85.5170,58.7942,41.0543,34.9053
2006-08,46.4461,87.9728,59.4993,41.5374,35.4426
2006-09,46.0105,86.6776,58.5357,41.2248,34.7320
2006-10,45.3552,85.1064,57.2258,40.1908,34.2149
2006-11,44.7257,85.5382,57.6394,39.3762,34.5616
2006-12,44.4835,87.3141,58.7391,38.5743,34.9531
2007-01,44.2062,86.5851,57.4366,37.5825,34.5947
2007-02,44.0195,86.2314,57.5798,37.5939,34.4658
2007-03,43.7936,85.2792,58.0048,37.4888,34.7302
2007-04,42.0176,83.5171,56.7705,37.0182,34.7587
2007-05,40.5686,80.4961,54.8412,37.0495,33.4868
2007-06,40.5905,80.6426,54.4744,38.1097,34.1917
2007-07,40.2738,81.9763,55.2816,38.3512,34.9430
2007-08,40.6791,81.8031,55.4258,38.4550,33.7197
2007-09,40.1735,81.0848,55.8740,39.1365,33.9815
2007-10,39.3661,80.5009,56.0306,40.3657,35.4113
2007-11,39.3267,81.4108,57.7424,40.6862,35.2391
2007-12,39.3750,79.3823,57.3244,39.2998,34.3293
2008-01,39.2676,77.3682,57.8334,38.8870,34.6472
2008-02,39.6735,77.9449,58.5569,39.7367,36.2346
2008-03,40.1452,80.3484,62.3033,40.0379,37.0193
2008-04,39.9668,79.1968,62.9611,39.4275,37.2060
2008-05,42.0019,82.5328,65.3364,42.0425,39.8743
2008-06,42.7633,84.0910,66.5459,42.0649,40.6726
2008-07,42.7027,84.9282,67.2953,42.1593,41.0802
2008-08,42.9057,80.9174,64.1518,40.7328,37.8096
2008-09,45.5300,81.8428,65.2970,43.0381,37.1844
2008-10,48.6155,81.9092,64.4510,41.1272,33.3530
2008-11,48.8517,74.8398,62.2509,40.1520,32.1801
2008-12,48.5132,72.0530,65.5009,39.3263,32.5827
2009-01,48.6995,70.4237,64.4936,39.7782,32.8883
2009-02,49.2484,71.0205,63.0145,39.5501,32.0276
2009-03,51.1291,72.4376,66.7049,40.4404,34.0680
2009-04,49.9655,73.5066,65.9482,40.8206,35.7650
2009-05,48.5100,74.7574,66.1768,42.0858,37.0851
2009-06,47.6736,78.0376,66.8079,42.3365,38.2550
2009-07,48.3624,79.2061,68.1480,43.1049,38.9220
2009-08,48.2426,79.7456,68.8218,44.3738,40.2980
2009-09,48.2924,78.8302,70.3809,44.6506,41.6338
2009-10,46.6524,75.6288,69.1403,44.2386,42.2934
2009-11,46.5305,77.2316,69.3638,43.9265,42.7903
2009-12,46.5273,75.4920,67.8250,44.1582,41.9700
2010-01,45.8944,74.1702,65.5203,44.0260,41.9311
2010-02,46.2732,72.2669,63.3001,43.7723,40.9832
2010-03,45.4509,68.4414,61.6774,44.4344,41.4636
2010-04,44.4440,68.1409,59.6287,44.2151,41.1628
2010-05,45.7690,67.1152,57.4812,43.9957,39.8480
2010-06,46.4983,68.6657,56.8330,44.8155,39.7001
2010-07,46.7617,71.5613,59.9041,44.8712,41.0824
2010-08,46.4605,72.7568,59.9416,44.6617,41.8282
2010-09,45.8729,71.5120,60.0867,44.4088,43.1018
2010-10,44.3540,70.3750,61.6559,43.5762,43.5459
2010-11,44.9315,71.7011,61.3324,44.3578,44.4225
2010-12,45.1000,70.3355,59.6272,44.7401,44.7801
2011-01,45.3750,71.6142,60.6751,45.6513,45.1991
2011-02,45.3795,73.1704,61.9693,45.9483,45.7631
2011-03,44.9143,72.5757,62.9681,45.9936,45.4203
2011-04,44.3010,72.5618,64.0571,46.2471,46.9071
2011-05,44.9024,73.3324,64.3582,46.3860,47.9298
2011-06,44.8109,72.6777,64.5400,45.8834,47.5733
2011-07,44.3960,71.7293,63.3740,46.4746,47.8603
2011-08,45.3135,74.1180,64.9537,46.1583,47.5828
2011-09,47.6905,75.1903,65.5334,47.5689,48.7011
2011-10,49.2020,77.5826,67.5657,48.2601,50.0254
2011-11,50.6785,80.0831,68.6900,49.4492,51.2210
2011-12,52.3824,81.6469,68.8929,51.1776,53.0135
2012-01,51.0015,79.1688,65.8306,50.3441,53.1038
2012-02,49.1812,77.7265,65.1075,49.3420,52.7807
2012-03,50.3635,79.6964,66.5183,50.6781,53.0062
2012-04,51.6900,82.7114,68.0261,52.0675,53.4997
2012-05,54.3314,86.4878,69.5532,53.8037,54.2041
2012-06,55.9424,87.0267,70.1575,54.4212,55.8656
2012-07,55.4248,86.4203,68.0451,54.6497,57.0895
2012-08,55.4935,87.2463,68.8468,55.9209,58.1272
2012-09,54.3500,87.6361,70.0170,55.5560,56.5508
2012-10,53.0995,85.3806,68.8912,53.7898,54.6828
2012-11,54.7845,87.4795,70.3295,54.9519,57.0014
2012-12,54.6470,88.2283,71.6958,55.2093,57.1884
2013-01,54.2290,86.5822,72.1389,54.6709,56.9417
2013-02,53.8079,83.2566,71.8096,53.2895,55.4715
2013-03,54.4229,82.0705,70.4944,53.1260,56.2998
2013-04,54.3236,83.1753,70.7565,53.3298,56.3902
2013-05,54.9845,84.0977,71.3808,53.9279,54.5193
2013-06,58.3835,90.4454,77.0442,56.6055,55.0929
2013-07,59.7609,90.7067,78.2126,57.4544,54.7084
2013-08,62.8109,97.4000,83.6256,60.3431,56.7511
2013-09,63.6480,101.0725,85.0416,61.5334,59.1964
2013-10,61.6059,99.1724,84.0645,59.4513,58.6378
2013-11,62.5179,100.6547,84.3411,59.6189,58.2916
2013-12,61.8110,101.2681,84.7290,58.0977,55.5081
2014-01,62.1057,102.2884,84.5742,56.7812,55.0093
2014-02,62.1642,102.9327,84.9475,56.2358,55.7827
2014-03,60.9476,101.3207,84.2802,54.8760,55.3902
2014-04,60.3464,101.0717,83.3405,54.9000,56.2125
2014-05,59.2843,99.8499,81.4537,54.4196,55.1631
2014-06,59.7367,101.0077,81.2105,55.1626,55.9443
2014-07,60.0956,102.5576,81.3290,55.9609,56.4204
2014-08,60.8738,101.6623,81.0556,55.7135,56.6673
2014-09,60.8976,99.2047,78.4884,55.3099,55.0549
2014-10,61.3668,98.6425,77.7951,54.7361,53.8854
2014-11,61.6828,97.2745,76.9352,54.4656,53.3176
2014-12,62.7071,98.0982,77.3105,54.3776,51.7679
2015-01,62.1300,94.0801,72.1775,51.2972,50.1026
2015-02,61.9905,95.0272,70.3609,49.5973,48.3340
2015-03,62.4805,93.4551,67.5959,49.5185,48.2564
2015-04,62.6414,93.7665,67.7947,50.7957,48.4889
2015-05,63.7150,98.4785,71.1518,52.3360,50.2769
2015-06,63.7809,99.3412,71.5982,51.5844,49.2072
2015-07,63.6045,98.9718,69.9476,49.4531,47.1121
2015-08,65.0971,101.4049,72.5083,49.5136,47.4826
2015-09,66.1667,101.4883,74.2961,49.8794,46.7041
2015-10,65.0262,99.7649,73.0093,49.7458,46.8189
2015-11,66.1000,100.4327,70.8989,49.7804,47.2357
2015-12,66.5023,99.6294,72.4130,48.5101,48.1952
2016-01,67.3332,96.8951,73.0921,47.3965,47.2027
2016-02,68.2395,97.5080,75.6918,49.4669,48.6857
2016-03,66.8909,95.3115,74.4684,50.5777,50.1938
2016-04,66.4219,95.1078,75.3607,51.8303,50.9051
2016-05,66.8895,97.1558,75.6617,51.6749,48.9469
2016-06,67.2655,95.4884,75.5478,52.1710,49.7842
2016-07,67.1580,88.2041,74.2423,51.4556,50.5628
2016-08,66.9035,87.6535,74.9757,51.4765,51.0381
2016-09,66.7138,87.6633,74.8384,50.8995,50.6414
2016-10,66.7415,82.2898,73.5106,50.3698,50.8203
2016-11,67.6395,84.0900,72.9778,50.3485,50.9330
2016-12,67.8052,84.6368,71.4959,50.8355,49.8071
2017-01,68.0474,84.1509,72.3667,51.6196,50.7952
2017-02,66.9726,83.6805,71.3276,51.0896,51.3285
2017-03,65.8009,81.2392,70.3423,49.1522,50.1537
2017-04,64.5360,81.5663,69.1405,48.0330,48.6194
2017-05,64.4195,83.2863,71.1845,47.3509,47.9077
2017-06,64.4482,82.5600,72.3946,48.4837,48.7377
2017-07,64.4240,83.7261,74.2807,50.7742,50.2920
2017-08,63.9683,82.8500,75.5639,50.7393,50.6289
2017-09,64.4775,86.0194,76.8099,52.5121,51.4091
2017-10,65.0357,85.8566,76.4525,51.5947,50.6507
2017-11,64.8435,85.7060,76.1442,50.7661,49.4074
2017-12,64.2445,86.1108,76.0398,50.3170,49.1338
2018-01,63.6452,87.9833,77.6262,51.2087,50.6347
2018-02,64.4300,89.9474,79.5020,51.1851,50.6825
2018-03,65.0455,90.9058,80.2266,50.2980,50.4713
2018-04,65.6729,92.4566,80.5732,51.5846,50.4568
2018-05,67.5100,90.9290,79.8102,52.4718,50.8029
2018-06,67.7900,90.1167,79.1705,51.6544,50.8207
2018-07,68.6867,90.4044,80.2574,52.3001,50.8501
2018-08,69.6317,89.6720,80.3998,53.3894,51.0004
2018-09,72.2779,94.4432,84.3270,55.4579,52.0847
2018-10,73.5609,95.7190,84.5029,56.5689,52.3106
2018-11,71.7380,92.5524,81.5236,54.3322,51.9881
2018-12,70.8331,89.6961,80.6080,52.7269,50.7838
2019-01,70.7100,91.2275,80.7337,53.1679,50.5632
2019-02,71.1739,92.6414,80.7794,53.8854,50.7939
2019-03,69.4895,91.4919,78.4964,51.9731,49.2088
2019-04,69.4068,90.4296,77.9711,51.8807,49.3570
2019-05,69.7827,89.7014,78.0656,51.8456,48.4661
2019-06,69.3880,87.9490,78.3734,52.2187,48.1962
2019-07,68.7391,85.6540,77.0660,52.4520,47.9656
2019-08,71.1891,86.5658,79.2238,53.6334,48.2264
2019-09,71.3110,88.1999,78.5236,53.8592,48.5981
2019-10,71.0086,89.8716,78.5227,53.8408,48.2716
2019-11,71.4942,92.1148,79.0048,54.0126,48.8103
2019-12,71.1567,93.2790,79.0819,54.0354,49.0053
2020-01,71.2790,93.2076,79.1029,54.4587,48.8362
2020-02,71.5295,92.6514,78.0441,53.8370,47.6682
2020-03,74.5482,92.1695,82.3313,53.4279,46.3299
2020-04,76.1682,94.5975,82.8036,54.2210,48.0786
2020-05,75.6575,93.0719,82.5217,54.1527,49.3044
2020-06,75.7077,94.8096,85.2392,55.8674,52.2318
2020-07,74.9286,95.1661,86.0786,55.5169,52.7500
2020-08,74.5657,97.9936,88.2176,56.3663,53.7075
2020-09,73.5233,95.1868,86.6465,55.5771,53.1115
2020-10,73.5648,95.4855,86.5694,55.6574,52.3869
2020-11,74.2311,97.9714,87.7866,56.7845,53.9676
2020-12,73.6195,98.9004,89.5788,57.4753,55.4467
2021-01,73.1106,99.7322,89.0323,57.4568,56.4854
2021-02,72.8053,100.9583,88.0502,57.3448,56.4469
2021-03,72.8196,100.9515,86.6667,57.9368,56.1464
2021-04,74.5186,103.1708,89.1695,59.6441,57.3899
2021-05,73.2065,103.0950,88.9153,60.3783,56.8292
2021-06,73.5782,103.1834,88.6415,60.2111,56.2335
2021-07,74.5390,102.9202,88.1166,59.4893,55.2842
2021-08,74.1155,102.2568,87.2107,58.8296,54.1358
2021-09,73.6357,101.1136,86.6275,58.1139,53.8430
2021-10,74.9200,102.6470,86.9050,60.2610,55.5302
2021-11,74.4770,100.2646,85.0208,59.2696,54.4179
2021-12,75.3948,100.2950,85.2010,58.9020,53.9458
2022-01,74.4075,100.8591,84.2029,58.9512,53.4246
2022-02,74.9695,101.5082,85.0821,58.9805,53.7446
2022-03,76.1896,100.3254,83.9481,60.1831,56.1803
2022-04,76.1719,98.5107,82.2836,60.3218,56.0908
2022-05,77.2933,96.1410,81.6771,60.1109,54.4252
2022-06,78.0900,96.2048,82.5171,60.9950,54.8561
2022-07,79.5915,95.4036,80.9293,61.5289,54.5690
2022-08,79.5065,95.2672,80.5283,61.5517,55.3436
2022-09,80.2538,90.8217,79.4306,60.1774,53.5276
2022-10,82.2915,93.2563,81.0813,60.1157,52.4208
2022-11,81.6805,95.7827,83.2406,60.6991,53.8697
2022-12,82.4738,100.4525,87.3470,60.7080,55.6534
2023-01,81.7410,100.0235,88.0855,60.9006,56.8510
2023-02,82.5995,99.8111,88.3970,61.3941,56.9342
2023-03,82.2665,99.8538,88.1182,60.1263,54.9217
2023-04,81.9685,102.0158,89.8535,60.7895,54.8242
2023-05,82.2977,102.7358,89.4305,60.8854,54.6721
2023-06,82.2252,103.8254,89.1328,61.8904,55.1940
2023-07,82.1565,105.9291,90.9203,62.1873,55.3845
2023-08,82.8122,105.2222,90.3478,61.4434,53.7108
2023-09,83.0700,102.8516,88.6495,61.3945,53.3701
2023-10,83.2162,101.3177,87.9142,60.6899,52.8209
2023-11,83.2660,103.5627,90.0879,60.7508,54.1870
2023-12,83.2540,105.3748,90.8243,62.0622,55.7195
2024-01,83.1119,105.5613,90.5824,61.9202,55.1564
2024-02,82.9485,104.7605,89.5266,61.4443,54.0946
2024-03,83.0214,105.5411,90.2464,61.3359,54.4488
2024-04,83.3968,104.3880,89.4340,60.9937,54.2619
2024-05,83.3873,105.3631,90.1432,61.0159,55.2504
2024-06,83.4600,106.1243,89.8294,60.8962,55.4377
2024-07,83.5895,107.5782,90.6664,60.9524,55.7748
2024-08,83.8855,108.5922,92.4436,61.4374,55.8483
2024-09,83.7910,110.7609,93.0444,61.8563,56.7276
2024-10,84.0050,109.5696,91.5186,61.0706,56.2867
2024-11,84.3326,107.4248,89.5709,60.3558,55.0507
2024-12,84.9686,107.4592,88.9806,59.6431,53.8137
2025-01,86.2652,106.5725,89.3363,59.9542,53.7503
2025-02,87.0637,109.1920,90.6578,60.8917,54.8621
2025-03,86.5214,111.7208,93.5555,60.2694,54.5075
2025-04,85.5768,112.4772,96.1147,61.2148,53.8280
2025-05,85.2462,113.8747,96.1026,61.4759,54.8524
2025-06,85.8765,116.5946,99.0464,62.8298,55.8962
2025-07,86.1714,116.2291,100.5650,62.9397,56.3175
2025-08,87.5695,117.8315,101.9959,63.4702,56.8773
2025-09,88.3214,119.2895,103.6776,63.8427,58.2703
2025-10,88.3691,118.0328,102.8677,63.1772,57.8543
2025-11,88.8444,116.7300,102.6879,63.2073,57.7634
2025-12,90.0350,120.5304,105.4345,65.2701,59.8065
2026-01,90.9025,123.0497,106.7668,66.0199,61.7473
2026-02,90.7458,123.2243,107.2982,66.4892,64.0647
2026-03,92.8182,123.8042,107.2642,67.6525,65.1227
2026-04,93.4805,125.7721,109.3486,67.9711,66.3127
2026-05,95.5335,128.9505,111.5908,69.6464,68.6631
2026-06,94.9600,126.6574,109.3607,67.6744,66.7134
2026-07,95.8573,128.2886,109.4968,67.9639,66.8228
2026-08,95.4443,129.2979,110.6550,68.6567,67.7981
2026-09,95.5124,128.0423,109.8808,68.3621,67.9503
2026-10,95.5167,126.9670,106.9582,67.5773,66.7456
`,repo:`month,repo
2001-01,10.00
2001-02,10.00
2001-03,9.00
2001-04,8.75
2001-05,8.75
2001-06,8.50
2001-07,8.50
2001-08,8.50
2001-09,8.50
2001-10,8.50
2001-11,8.50
2001-12,8.50
2002-01,8.50
2002-02,8.50
2002-03,8.00
2002-04,8.00
2002-05,8.00
2002-06,8.00
2002-07,8.00
2002-08,8.00
2002-09,8.00
2002-10,8.00
2002-11,7.50
2002-12,7.50
2003-01,7.50
2003-02,7.50
2003-03,7.00
2003-04,7.00
2003-05,7.00
2003-06,7.00
2003-07,7.00
2003-08,7.00
2003-09,7.00
2003-10,7.00
2003-11,7.00
2003-12,7.00
2004-01,7.00
2004-02,7.00
2004-03,6.00
2004-04,6.00
2004-05,6.00
2004-06,6.00
2004-07,6.00
2004-08,6.00
2004-09,6.00
2004-10,6.00
2004-11,6.00
2004-12,6.00
2005-01,6.00
2005-02,6.00
2005-03,6.00
2005-04,6.00
2005-05,6.00
2005-06,6.00
2005-07,6.00
2005-08,6.00
2005-09,6.00
2005-10,6.25
2005-11,6.25
2005-12,6.25
2006-01,6.50
2006-02,6.50
2006-03,6.50
2006-04,6.50
2006-05,6.50
2006-06,6.50
2006-07,7.00
2006-08,7.00
2006-09,7.00
2006-10,7.25
2006-11,7.25
2006-12,7.25
2007-01,7.50
2007-02,7.50
2007-03,7.75
2007-04,7.75
2007-05,7.75
2007-06,7.75
2007-07,7.75
2007-08,7.75
2007-09,7.75
2007-10,7.75
2007-11,7.75
2007-12,7.75
2008-01,7.75
2008-02,7.75
2008-03,7.75
2008-04,7.75
2008-05,7.75
2008-06,8.50
2008-07,9.00
2008-08,9.00
2008-09,9.00
2008-10,8.00
2008-11,7.50
2008-12,6.50
2009-01,5.50
2009-02,5.50
2009-03,5.00
2009-04,4.75
2009-05,4.75
2009-06,4.75
2009-07,4.75
2009-08,4.75
2009-09,4.75
2009-10,4.75
2009-11,4.75
2009-12,4.75
2010-01,4.75
2010-02,4.75
2010-03,5.00
2010-04,5.25
2010-05,5.25
2010-06,5.25
2010-07,5.75
2010-08,5.75
2010-09,6.00
2010-10,6.00
2010-11,6.25
2010-12,6.25
2011-01,6.50
2011-02,6.50
2011-03,6.75
2011-04,6.75
2011-05,7.25
2011-06,7.50
2011-07,8.00
2011-08,8.00
2011-09,8.25
2011-10,8.50
2011-11,8.50
2011-12,8.50
2012-01,8.50
2012-02,8.50
2012-03,8.50
2012-04,8.00
2012-05,8.00
2012-06,8.00
2012-07,8.00
2012-08,8.00
2012-09,8.00
2012-10,8.00
2012-11,8.00
2012-12,8.00
2013-01,7.75
2013-02,7.75
2013-03,7.50
2013-04,7.50
2013-05,7.25
2013-06,7.25
2013-07,7.25
2013-08,7.25
2013-09,7.50
2013-10,7.75
2013-11,7.75
2013-12,7.75
2014-01,8.00
2014-02,8.00
2014-03,8.00
2014-04,8.00
2014-05,8.00
2014-06,8.00
2014-07,8.00
2014-08,8.00
2014-09,8.00
2014-10,8.00
2014-11,8.00
2014-12,8.00
2015-01,7.75
2015-02,7.75
2015-03,7.50
2015-04,7.50
2015-05,7.50
2015-06,7.25
2015-07,7.25
2015-08,7.25
2015-09,6.75
2015-10,6.75
2015-11,6.75
2015-12,6.75
2016-01,6.75
2016-02,6.75
2016-03,6.75
2016-04,6.50
2016-05,6.50
2016-06,6.50
2016-07,6.50
2016-08,6.50
2016-09,6.50
2016-10,6.25
2016-11,6.25
2016-12,6.25
2017-01,6.25
2017-02,6.25
2017-03,6.25
2017-04,6.25
2017-05,6.25
2017-06,6.25
2017-07,6.25
2017-08,6.00
2017-09,6.00
2017-10,6.00
2017-11,6.00
2017-12,6.00
2018-01,6.00
2018-02,6.00
2018-03,6.00
2018-04,6.00
2018-05,6.00
2018-06,6.25
2018-07,6.25
2018-08,6.50
2018-09,6.50
2018-10,6.50
2018-11,6.50
2018-12,6.50
2019-01,6.50
2019-02,6.25
2019-03,6.25
2019-04,6.00
2019-05,6.00
2019-06,5.75
2019-07,5.75
2019-08,5.40
2019-09,5.40
2019-10,5.15
2019-11,5.15
2019-12,5.15
2020-01,5.15
2020-02,5.15
2020-03,4.40
2020-04,4.40
2020-05,4.00
2020-06,4.00
2020-07,4.00
2020-08,4.00
2020-09,4.00
2020-10,4.00
2020-11,4.00
2020-12,4.00
2021-01,4.00
2021-02,4.00
2021-03,4.00
2021-04,4.00
2021-05,4.00
2021-06,4.00
2021-07,4.00
2021-08,4.00
2021-09,4.00
2021-10,4.00
2021-11,4.00
2021-12,4.00
2022-01,4.00
2022-02,4.00
2022-03,4.00
2022-04,4.00
2022-05,4.40
2022-06,4.90
2022-07,4.90
2022-08,5.40
2022-09,5.90
2022-10,5.90
2022-11,5.90
2022-12,6.25
2023-01,6.25
2023-02,6.50
2023-03,6.50
2023-04,6.50
2023-05,6.50
2023-06,6.50
2023-07,6.50
2023-08,6.50
2023-09,6.50
2023-10,6.50
2023-11,6.50
2023-12,6.50
2024-01,6.50
2024-02,6.50
2024-03,6.50
2024-04,6.50
2024-05,6.50
2024-06,6.50
2024-07,6.50
2024-08,6.50
2024-09,6.50
2024-10,6.50
2024-11,6.50
2024-12,6.50
2025-01,6.50
2025-02,6.25
2025-03,6.25
2025-04,6.00
2025-05,6.00
2025-06,5.50
2025-07,5.50
2025-08,5.50
2025-09,5.50
2025-10,5.50
2025-11,5.50
2025-12,5.25
2026-01,5.25
2026-02,5.25
2026-03,5.25
2026-04,5.25
2026-05,5.25
2026-06,5.25
2026-07,5.25
2026-08,5.25
2026-09,5.25
2026-10,5.50
`,lenders:`lender,type,rate_min,rate_max,processing_fee,max_loan,collateral_free_cap,margin_money,moratorium_interest,benchmark,source,as_of
SBI Global Ed-Vantage,PSU bank,9.65,11.15,"Rs 10,000 flat",Rs 1.5 Cr,Rs 50L (premier list),15%,"Capitalised; 1% concession if interest serviced",EBR (repo-linked),ivyedgesop.com,2026-04
Bank of Baroda Baroda Scholar,PSU bank,8.70,12.70,"1%, capped at Rs 10,000",Rs 1.5 Cr,Rs 40L (premier STEM),10%,Capitalised,BRLLR (repo-linked),ivyedgesop.com,2026-04
Canara Bank IBA,PSU bank,9.25,11.25,"Rs 0-5,000",Rs 1.5 Cr,Rs 7.5L,n/a,Capitalised,RLLR (repo-linked),ivyedgesop.com,2026-04
Bank of India Star,PSU bank,9.35,11.35,"Rs 5,000-10,000",Rs 1.5 Cr,Rs 7.5L,n/a,n/a,RBLR (repo-linked),ivyedgesop.com,2026-04
Union Bank of India,PSU bank,9.00,11.70,n/a,Rs 1.5 Cr,n/a,n/a,n/a,EBLR (repo-linked),nomadcredit.com,2026
HDFC Credila,NBFC,9.75,11.25,1-1.25% + GST,No cap (secured); Rs 75L (unsecured),Rs 50-75L (premier),0%,n/a,Own benchmark,ivyedgesop.com,2026-04
Avanse,NBFC,10.25,14.00,1.25-1.75% + GST,Rs 3 Cr (secured); Rs 1.25 Cr (unsecured),Up to Rs 1.25 Cr,0%,n/a,Own benchmark,ivyedgesop.com,2026-04
InCred,NBFC,10.50,12.50,0.5-1.25% + GST,Rs 2 Cr (secured); Rs 75L (unsecured),Up to Rs 75L,0%,n/a,Own benchmark,ivyedgesop.com,2026-04
Auxilo,NBFC,11.25,14.00,Up to 2% + GST,Rs 65L,Case by case,n/a,n/a,Own benchmark,ivyedgesop.com,2026-04
ICICI Bank,Private bank,10.25,12.75,1-2% + GST,Rs 3 Cr (secured); Rs 1.5 Cr (unsecured),Rs 1 Cr (select institutes),n/a,n/a,n/a,ivyedgesop.com,2026-04
Axis Bank,Private bank,9.99,13.70,0.75-2% + GST,Rs 1.5 Cr (unsecured),Rs 75L-1 Cr,n/a,n/a,n/a,ivyedgesop.com,2026-04
Prodigy Finance,International (USD),9.65,12.15,4.2% admin fee (capitalised),USD 220K,Full (no collateral or cosigner),n/a,n/a,Own (USD),ivyedgesop.com / nomadcredit.com,2026
MPOWER Financing,International (USD),9.99,9.99,n/a,Varies,Full (no collateral or cosigner),n/a,n/a,Fixed APR,nomadcredit.com,2026
Leap Finance,International (USD),8.45,n/a,n/a,Full cost of attendance,Full (no collateral or cosigner),n/a,n/a,Own (USD),nomadcredit.com,2026
`,universities:`university,country,city,program,duration_months,tuition_total,tuition_currency,tuition_source,living_per_month,living_currency,living_basis,tuition_inr_lakh,living_inr_lakh,total_today_inr_lakh,total_typical_fx_inr_lakh,total_bad_case_fx_inr_lakh\r
Carnegie Mellon University,United States,Pittsburgh,MS Computer Science,24,93000,USD,"Yocket listing 2026 (approx. program total, USD)",2600,USD,"City estimate, Collegedunia (Pittsburgh)",88.8,59.6,148.4,152.3,166.2\r
Stanford University,United States,Stanford,MS Computer Science,24,80000,USD,"Yocket listing 2026 (approx. program total, USD)",3850,USD,"City estimate, Collegedunia (Bay Area)",76.4,88.3,164.7,169.0,184.4\r
University of Illinois Urbana-Champaign,United States,Champaign,MS Computer Science,24,81000,USD,"Yocket listing 2026 (approx. program total, USD)",1850,USD,"City estimate, Collegedunia (Champaign)",77.4,42.4,119.8,122.9,134.1\r
Georgia Institute of Technology,United States,Atlanta,MS Computer Science,24,49000,USD,"Yocket listing 2026 (approx. program total, USD)",2150,USD,"City estimate, Collegedunia (Atlanta)",46.8,49.3,96.1,98.6,107.6\r
University of Texas at Austin,United States,Austin,MS Computer Science (coursework),24,57000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,54.4,50.4,104.9,107.6,117.5\r
Cornell University,United States,Ithaca,MEng Computer Science,12,74000,USD,"Yocket listing 2026 (approx. program total, USD)",2400,USD,"City estimate, Collegedunia (Ithaca)",70.7,27.5,98.2,99.3,104.9\r
University of California San Diego,United States,San Diego,MS Computer Science and Engineering,24,76000,USD,"Yocket listing 2026 (approx. program total, USD)",3200,USD,LoanLens tier: coastal California,72.6,73.4,145.9,149.8,163.4\r
Columbia University,United States,New York,MS Computer Science,18,85000,USD,"Yocket listing 2026 (approx. program total, USD)",4250,USD,"City estimate, Collegedunia (NYC)",81.2,73.1,154.3,157.1,168.9\r
California Institute of Technology,United States,Pasadena,MS Computer Science,24,131000,USD,"Yocket listing 2026 (approx. program total, USD)",3600,USD,"City estimate, Collegedunia (Los Angeles)",125.1,82.5,207.7,213.1,232.5\r
University of Wisconsin-Madison,United States,Madison,MS Computer Sciences,24,45000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,43.0,50.4,93.4,95.9,104.6\r
Purdue University West Lafayette,United States,West Lafayette,MS Computer Science (non-thesis),24,55000,USD,"Yocket listing 2026 (approx. program total, USD)",1800,USD,LoanLens tier: college town,52.5,41.3,93.8,96.2,105.0\r
University of California Los Angeles,United States,Los Angeles,MS Computer Science,24,56000,USD,"Yocket listing 2026 (approx. program total, USD)",3600,USD,"City estimate, Collegedunia (Los Angeles)",53.5,82.5,136.0,139.6,152.3\r
University of Maryland College Park,United States,College Park,MS Computer Science,24,57000,USD,"Yocket listing 2026 (approx. program total, USD)",2600,USD,LoanLens tier: large metro,54.4,59.6,114.0,117.0,127.7\r
Texas A&M University,United States,College Station,Masters Computer Science,24,38000,USD,"Yocket listing 2026 (approx. program total, USD)",1800,USD,LoanLens tier: college town,36.3,41.3,77.6,79.6,86.9\r
Johns Hopkins University,United States,Baltimore,MSE Computer Science,24,113000,USD,"Yocket listing 2026 (approx. program total, USD)",2600,USD,LoanLens tier: large metro,107.9,59.6,167.5,171.9,187.6\r
University of Southern California,United States,Los Angeles,MS Computer Science,24,81000,USD,"Yocket listing 2026 (approx. program total, USD)",3600,USD,"City estimate, Collegedunia (Los Angeles)",77.4,82.5,159.9,164.1,179.1\r
Yale University,United States,New Haven,MS Computer Science,24,52000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,49.7,50.4,100.1,102.7,112.1\r
University of Massachusetts Amherst,United States,Amherst,MS Computer Science,24,59000,USD,"Yocket listing 2026 (approx. program total, USD)",1800,USD,LoanLens tier: college town,56.4,41.3,97.6,100.2,109.3\r
University of Virginia,United States,Charlottesville,MS Computer Science,24,60000,USD,"Yocket listing 2026 (approx. program total, USD)",1800,USD,LoanLens tier: college town,57.3,41.3,98.6,101.1,110.4\r
Duke University,United States,Durham,MS Computer Science,24,105000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,100.3,50.4,150.7,154.7,168.8\r
Pennsylvania State University,United States,University Park,MEng Computer Science and Engineering,24,51000,USD,"Yocket listing 2026 (approx. program total, USD)",1800,USD,LoanLens tier: college town,48.7,41.3,90.0,92.3,100.8\r
University of California Santa Barbara,United States,Santa Barbara,MS Computer Science,24,59000,USD,"Yocket listing 2026 (approx. program total, USD)",3200,USD,LoanLens tier: coastal California,56.4,73.4,129.7,133.1,145.3\r
New York University,United States,New York,MS Computer Science,24,79000,USD,"Yocket listing 2026 (approx. program total, USD)",4250,USD,"City estimate, Collegedunia (NYC)",75.5,97.4,172.9,177.4,193.6\r
Northwestern University,United States,Evanston,MS Computer Science,24,71000,USD,"Yocket listing 2026 (approx. program total, USD)",2600,USD,LoanLens tier: large metro,67.8,59.6,127.4,130.7,142.7\r
University of North Carolina at Chapel Hill,United States,Chapel Hill,MS Computer Science,24,66000,USD,"Yocket listing 2026 (approx. program total, USD)",1800,USD,LoanLens tier: college town,63.0,41.3,104.3,107.0,116.8\r
Northeastern University Boston,United States,Boston,MS Computer Science,24,62000,USD,"Yocket listing 2026 (approx. program total, USD)",3300,USD,"City estimate, Collegedunia (Boston/Cambridge)",59.2,75.6,134.9,138.4,151.0\r
University of California Irvine,United States,Irvine,Masters Computer Science,24,60000,USD,"Yocket listing 2026 (approx. program total, USD)",3200,USD,LoanLens tier: coastal California,57.3,73.4,130.7,134.1,146.3\r
Brown University,United States,Providence,MSc Computer Science,24,88000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,84.1,50.4,134.5,138.0,150.6\r
The Ohio State University,United States,Columbus,MS Computer Science and Engineering (thesis),24,64000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,61.1,50.4,111.6,114.5,124.9\r
University of Minnesota Twin Cities,United States,Minneapolis,MS Computer Science,24,37000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,35.3,50.4,85.8,88.0,96.1\r
Virginia Tech,United States,Blacksburg,MS Computer Science,24,56000,USD,"Yocket listing 2026 (approx. program total, USD)",1800,USD,LoanLens tier: college town,53.5,41.3,94.8,97.2,106.1\r
Washington University in St. Louis,United States,St. Louis,MS Computer Science,24,100000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,95.5,50.4,145.9,149.8,163.4\r
University of California Davis,United States,Davis,MS Computer Science (thesis),24,58000,USD,"Yocket listing 2026 (approx. program total, USD)",3200,USD,LoanLens tier: coastal California,55.4,73.4,128.8,132.1,144.2\r
University of Colorado Boulder,United States,Boulder,Masters Computer Science (professional),24,65000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,62.1,50.4,112.5,115.5,126.0\r
University of Notre Dame,United States,Notre Dame,MS Computer Science and Engineering,24,64000,USD,"Yocket listing 2026 (approx. program total, USD)",1800,USD,LoanLens tier: college town,61.1,41.3,102.4,105.1,114.7\r
Rutgers University New Brunswick,United States,New Brunswick,MS Computer Science,24,74000,USD,"Yocket listing 2026 (approx. program total, USD)",2600,USD,LoanLens tier: large metro,70.7,59.6,130.3,133.7,145.9\r
Arizona State University,United States,Tempe,MS Computer Science,24,53000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,50.6,50.4,101.1,103.7,113.2\r
Boston University,United States,Boston,MS Computer Science,24,110000,USD,"Yocket listing 2026 (approx. program total, USD)",3300,USD,"City estimate, Collegedunia (Boston/Cambridge)",105.1,75.6,180.7,185.4,202.4\r
Stony Brook University (SUNY),United States,Stony Brook,MS Computer Science,24,35000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,33.4,50.4,83.9,86.1,93.9\r
North Carolina State University,United States,Raleigh,Masters Computer Science,24,56000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,53.5,50.4,103.9,106.6,116.4\r
Indiana University Bloomington,United States,Bloomington,MS Computer Science,24,52000,USD,"Yocket listing 2026 (approx. program total, USD)",1800,USD,LoanLens tier: college town,49.7,41.3,90.9,93.3,101.8\r
Michigan State University,United States,East Lansing,MS Computer Science,24,56000,USD,"Yocket listing 2026 (approx. program total, USD)",1800,USD,LoanLens tier: college town,53.5,41.3,94.8,97.2,106.1\r
University of Utah,United States,Salt Lake City,MS Computer Science,24,37000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,35.3,50.4,85.8,88.0,96.1\r
University of Illinois Chicago,United States,Chicago,MS Computer Science (project),24,43000,USD,"Yocket listing 2026 (approx. program total, USD)",2600,USD,LoanLens tier: large metro,41.1,59.6,100.7,103.3,112.7\r
University of Arizona,United States,Tucson,MS Computer Science (non-thesis),24,58000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,55.4,50.4,105.8,108.6,118.5\r
The University of Texas at Dallas,United States,Richardson,MS Computer Science,24,53000,USD,"Yocket listing 2026 (approx. program total, USD)",2200,USD,LoanLens tier: mid-size city,50.6,50.4,101.1,103.7,113.2\r
Tufts University,United States,Medford,MS Computer Science,24,54000,USD,"Yocket listing 2026 (approx. program total, USD)",3300,USD,"City estimate, Collegedunia (Boston/Cambridge)",51.6,75.6,127.2,130.5,142.5\r
George Mason University,United States,Fairfax,MS Computer Science,24,47000,USD,"Yocket listing 2026 (approx. program total, USD)",2600,USD,LoanLens tier: large metro,44.9,59.6,104.5,107.2,117.0\r
University at Buffalo (SUNY),United States,Buffalo,MS Computer Science and Engineering,24,32000,USD,"Yocket listing 2026 (approx. program total, USD)",1800,USD,LoanLens tier: college town,30.6,41.3,71.8,73.7,80.4\r
Rochester Institute of Technology,United States,Rochester,MS Computer Science,24,77000,USD,"Yocket listing 2026 (approx. program total, USD)",1800,USD,LoanLens tier: college town,73.5,41.3,114.8,117.8,128.6\r
University of Oxford,United Kingdom,Oxford,MSc Computer Science,12,32760,GBP,"Yocket UK guide 2026 (annual, GBP)",1171,GBP,"UKVI maintenance, outside London (applications before 30 Nov 2026)",41.6,17.8,59.4,60.3,64.4\r
University of Cambridge,United Kingdom,Cambridge,MSc Computer Science,12,39708,GBP,"Yocket UK guide 2026 (annual, GBP)",1171,GBP,"UKVI maintenance, outside London (applications before 30 Nov 2026)",50.4,17.8,68.3,69.2,73.9\r
Imperial College London,United Kingdom,London,MSc Computer Science,12,39400,GBP,"Yocket UK guide 2026 (annual, GBP)",1529,GBP,"UKVI maintenance, London (applications before 30 Nov 2026)",50.0,23.3,73.3,74.3,79.4\r
University College London,United Kingdom,London,MSc Computer Science,12,39800,GBP,"Yocket UK guide 2026 (annual, GBP)",1529,GBP,"UKVI maintenance, London (applications before 30 Nov 2026)",50.5,23.3,73.8,74.8,80.0\r
University of Edinburgh,United Kingdom,Edinburgh,MSc Computer Science,12,38500,GBP,"Yocket UK guide 2026 (annual, GBP)",1171,GBP,"UKVI maintenance, outside London (applications before 30 Nov 2026)",48.9,17.8,66.7,67.6,72.3\r
University of Manchester,United Kingdom,Manchester,MSc Computer Science,12,33000,GBP,"Yocket UK guide 2026 (annual, GBP)",1171,GBP,"UKVI maintenance, outside London (applications before 30 Nov 2026)",41.9,17.8,59.7,60.6,64.7\r
King's College London,United Kingdom,London,MSc Computer Science,12,35244,GBP,"Yocket UK guide 2026 (annual, GBP)",1529,GBP,"UKVI maintenance, London (applications before 30 Nov 2026)",44.7,23.3,68.0,69.0,73.7\r
University of Southampton,United Kingdom,Southampton,MSc Computer Science,12,30160,GBP,"Yocket UK guide 2026 (annual, GBP)",1171,GBP,"UKVI maintenance, outside London (applications before 30 Nov 2026)",38.3,17.8,56.1,56.9,60.8\r
University of Bristol,United Kingdom,Bristol,MSc Computer Science,12,32500,GBP,"Yocket UK guide 2026 (annual, GBP)",1171,GBP,"UKVI maintenance, outside London (applications before 30 Nov 2026)",41.3,17.8,59.1,59.9,64.0\r
University of Warwick,United Kingdom,Coventry,MSc Computer Science,12,33340,GBP,"Yocket UK guide 2026 (annual, GBP)",1171,GBP,"UKVI maintenance, outside London (applications before 30 Nov 2026)",42.3,17.8,60.2,61.0,65.2\r
University of British Columbia,Canada,Vancouver,MSc Computer Science,24,14000,USD,"Yocket Canada listing 2026 (approx. program total, USD)",1908,CAD,"IRCC study permit proof of funds (CAD 22,895/yr)",13.4,30.9,44.3,45.7,49.2\r
McGill University,Canada,Montreal,MSc Computer Science (non-thesis),24,42000,USD,"Yocket Canada listing 2026 (approx. program total, USD)",1908,CAD,"IRCC study permit proof of funds (CAD 22,895/yr)",40.1,30.9,71.1,73.1,79.1\r
University of Waterloo,Canada,Waterloo,MMath Computer Science,24,33000,USD,"Yocket Canada listing 2026 (approx. program total, USD)",1908,CAD,"IRCC study permit proof of funds (CAD 22,895/yr)",31.5,30.9,62.5,64.3,69.5\r
University of Toronto,Canada,Toronto,MSc Applied Computing,16,62000,USD,"Yocket Canada listing 2026 (approx. program total, USD)",1908,CAD,"IRCC study permit proof of funds (CAD 22,895/yr)",59.2,20.6,79.9,81.2,86.7\r
McMaster University,Canada,Hamilton,MSc Computer Science,24,58000,USD,"Yocket Canada listing 2026 (approx. program total, USD)",1908,CAD,"IRCC study permit proof of funds (CAD 22,895/yr)",55.4,30.9,86.3,88.8,96.2\r
Universite de Montreal,Canada,Montreal,Masters Computer Science,24,47000,USD,"Yocket Canada listing 2026 (approx. program total, USD)",1908,CAD,"IRCC study permit proof of funds (CAD 22,895/yr)",44.9,30.9,75.8,78.0,84.5\r
Concordia University,Canada,Montreal,Masters Applied Computer Science,24,24000,USD,"Yocket Canada listing 2026 (approx. program total, USD)",1908,CAD,"IRCC study permit proof of funds (CAD 22,895/yr)",22.9,30.9,53.9,55.5,59.9\r
Western University,Canada,London ON,MSc Computer Science,24,19000,USD,"Yocket Canada listing 2026 (approx. program total, USD)",1908,CAD,"IRCC study permit proof of funds (CAD 22,895/yr)",18.1,30.9,49.1,50.6,54.5\r
University of Ottawa,Canada,Ottawa,Masters Computer Science (coursework),24,24000,USD,"Yocket Canada listing 2026 (approx. program total, USD)",1908,CAD,"IRCC study permit proof of funds (CAD 22,895/yr)",22.9,30.9,53.9,55.5,59.9\r
Carleton University,Canada,Ottawa,Masters Computer Science,24,38000,USD,"Yocket Canada listing 2026 (approx. program total, USD)",1908,CAD,"IRCC study permit proof of funds (CAD 22,895/yr)",36.3,30.9,67.2,69.2,74.8\r
Northeastern University Vancouver,Canada,Vancouver,MS Computer Science,24,37000,USD,"Yocket Canada listing 2026 (approx. program total, USD)",1908,CAD,"IRCC study permit proof of funds (CAD 22,895/yr)",35.3,30.9,66.3,68.2,73.8\r
University of Guelph,Canada,Guelph,MSc Computer Science,24,29000,USD,"Yocket Canada listing 2026 (approx. program total, USD)",1908,CAD,"IRCC study permit proof of funds (CAD 22,895/yr)",27.7,30.9,58.6,60.4,65.2\r
The University of Melbourne,Australia,Melbourne,Master of Computer Science,24,93000,USD,"Yocket Australia listing 2026 (approx. program total, USD)",2476,AUD,"Australian student visa living cost requirement (AUD 29,710/yr)",88.8,39.7,128.5,131.7,145.8\r
The University of Sydney,Australia,Sydney,Master of Computer Science,24,77000,USD,"Yocket Australia listing 2026 (approx. program total, USD)",2476,AUD,"Australian student visa living cost requirement (AUD 29,710/yr)",73.5,39.7,113.2,116.0,128.7\r
Australian National University,Australia,Canberra,Master of Computing,24,79000,USD,"Yocket Australia listing 2026 (approx. program total, USD)",2476,AUD,"Australian student visa living cost requirement (AUD 29,710/yr)",75.5,39.7,115.1,118.0,130.8\r
The University of Queensland,Australia,Brisbane,Master of Computer Science,24,41000,USD,"Yocket Australia listing 2026 (approx. program total, USD)",2476,AUD,"Australian student visa living cost requirement (AUD 29,710/yr)",39.2,39.7,78.8,80.7,90.2\r
Adelaide University,Australia,Adelaide,Master of Computer Science,24,80000,USD,"Yocket Australia listing 2026 (approx. program total, USD)",2476,AUD,"Australian student visa living cost requirement (AUD 29,710/yr)",76.4,39.7,116.1,119.0,131.9\r
RMIT University,Australia,Melbourne,MSc Computer Science (research),24,51000,USD,"Yocket Australia listing 2026 (approx. program total, USD)",2476,AUD,"Australian student visa living cost requirement (AUD 29,710/yr)",48.7,39.7,88.4,90.5,100.9\r
University of Technology Sydney,Australia,Sydney,MSc Computing Sciences (research),24,63000,USD,"Yocket Australia listing 2026 (approx. program total, USD)",2476,AUD,"Australian student visa living cost requirement (AUD 29,710/yr)",60.2,39.7,99.8,102.3,113.7\r
University of Wollongong,Australia,Wollongong,Master of Computer Science,24,61000,USD,"Yocket Australia listing 2026 (approx. program total, USD)",2476,AUD,"Australian student visa living cost requirement (AUD 29,710/yr)",58.3,39.7,97.9,100.3,111.6\r
Technical University of Munich,Germany,Munich,MSc Informatics / Computer Science,24,24600,EUR,"TUM non-EU fee EUR 4,000-6,000/semester (upper bound used) + semester fee; GradGermany Oct 2026",992,EUR,"German blocked account (EUR 11,904/yr)",26.3,25.5,51.8,54.3,59.4\r
Ludwig Maximilian University of Munich,Germany,Munich,MSc Informatics / Computer Science,24,600,EUR,No general non-EU fee in Bavaria at LMU; semester fee only,992,EUR,"German blocked account (EUR 11,904/yr)",0.6,25.5,26.1,27.4,29.9\r
RWTH Aachen University,Germany,Aachen,MSc Informatics / Computer Science,24,1400,EUR,No non-EU tuition (NRW); semester contribution ~EUR 350,992,EUR,"German blocked account (EUR 11,904/yr)",1.5,25.5,27.0,28.3,30.9\r
Technical University of Berlin,Germany,Berlin,MSc Informatics / Computer Science,24,1400,EUR,No non-EU tuition (Berlin); semester contribution ~EUR 350,992,EUR,"German blocked account (EUR 11,904/yr)",1.5,25.5,27.0,28.3,30.9\r
Technical University of Darmstadt,Germany,Darmstadt,MSc Informatics / Computer Science,24,1400,EUR,No non-EU tuition (Hesse); semester contribution ~EUR 350,992,EUR,"German blocked account (EUR 11,904/yr)",1.5,25.5,27.0,28.3,30.9\r
Karlsruhe Institute of Technology,Germany,Karlsruhe,MSc Informatics / Computer Science,24,6700,EUR,"Baden-Wuerttemberg non-EU fee EUR 1,500/semester + semester fee",992,EUR,"German blocked account (EUR 11,904/yr)",7.2,25.5,32.6,34.2,37.4\r
University of Stuttgart,Germany,Stuttgart,MSc Informatics / Computer Science,24,6800,EUR,"Baden-Wuerttemberg non-EU fee EUR 1,500/semester + semester fee",992,EUR,"German blocked account (EUR 11,904/yr)",7.3,25.5,32.7,34.3,37.5\r
Heidelberg University,Germany,Heidelberg,MSc Informatics / Computer Science,24,6700,EUR,"Baden-Wuerttemberg non-EU fee EUR 1,500/semester + semester fee",992,EUR,"German blocked account (EUR 11,904/yr)",7.2,25.5,32.6,34.2,37.4\r
University of Bonn,Germany,Bonn,MSc Informatics / Computer Science,24,1400,EUR,No non-EU tuition (NRW); semester contribution ~EUR 350,992,EUR,"German blocked account (EUR 11,904/yr)",1.5,25.5,27.0,28.3,30.9\r
TU Dresden,Germany,Dresden,MSc Informatics / Computer Science,24,1440,EUR,No non-EU tuition (Saxony); semester contribution ~EUR 360,992,EUR,"German blocked account (EUR 11,904/yr)",1.5,25.5,27.0,28.3,31.0\r
Trinity College Dublin,Ireland,Dublin,MSc Computer Science / Computing,12,24700,EUR,"EduGoAbroad Ireland guide 2026 (annual, EUR)",833,EUR,"Irish immigration minimum funds (EUR 10,000/yr)",26.4,10.7,37.1,37.9,40.6\r
University College Dublin,Ireland,Dublin,MSc Computer Science / Computing,12,25200,EUR,"EduGoAbroad Ireland guide 2026 (annual, EUR)",833,EUR,"Irish immigration minimum funds (EUR 10,000/yr)",27.0,10.7,37.6,38.4,41.2\r
University of Galway,Ireland,Galway,MSc Computer Science / Computing,12,18500,EUR,"EduGoAbroad Ireland guide 2026 (annual, EUR)",833,EUR,"Irish immigration minimum funds (EUR 10,000/yr)",19.8,10.7,30.5,31.1,33.3\r
Dublin City University,Ireland,Dublin,MSc Computer Science / Computing,12,17000,EUR,"EduGoAbroad Ireland guide 2026 (annual, EUR)",833,EUR,"Irish immigration minimum funds (EUR 10,000/yr)",18.2,10.7,28.9,29.5,31.6\r
University College Cork,Ireland,Cork,MSc Computer Science / Computing,12,18000,EUR,"EduGoAbroad Ireland guide 2026 (annual, EUR)",833,EUR,"Irish immigration minimum funds (EUR 10,000/yr)",19.3,10.7,29.9,30.6,32.7\r
Maynooth University,Ireland,Maynooth,MSc Computer Science / Computing,12,15000,EUR,"EduGoAbroad Ireland guide 2026 (annual, EUR)",833,EUR,"Irish immigration minimum funds (EUR 10,000/yr)",16.0,10.7,26.7,27.3,29.2\r
Technological University Dublin,Ireland,Dublin,MSc Computer Science / Computing,12,14000,EUR,"EduGoAbroad Ireland guide 2026 (annual, EUR)",833,EUR,"Irish immigration minimum funds (EUR 10,000/yr)",15.0,10.7,25.7,26.2,28.1\r
`};var T0=y0(h0),{CURRENCIES:on,FX:P,FX_AS_OF:g0,SPOT:z,REPO:G,REPO_NOW:o0,REPO_AS_OF:S0,LENDERS:U0,UNIVERSITIES:_0,findUniversity:r0,searchUniversities:C0,findLender:a0,fxStats:b0,SALARY_BENCHMARKS:i0,SOURCES:v0}=T0;var D0=.18,P0=.05,G0=1e6,O0=1.5,$0="2001-01",F0={"United States":27,"United Kingdom":28,Canada:27,Australia:27,Germany:38,Ireland:33},y=(n,t=0)=>{let o=10**t;return Math.round((n+Number.EPSILON)*o)/o},K=(n,t)=>{let o=[...n].sort((r,s)=>r-s);return o[Math.min(o.length-1,Math.max(0,Math.round(t*(o.length-1))))]},d0={fx_shock_pct:0,pay_interest_during_study:!1,tax_regime:"new",tax_slab_pct:30,expected_salary:null,salary_currency:null,effective_tax_pct:null,return_to_india:!1,prepay_monthly_inr:0,india_salary_inr:null};function Z(n){let t=n.duration_months||24,o=[];for(let r of n.costs||[]){let s=(r.currency||n.currency||"USD").toUpperCase(),U=Number(r.amount)||0;if(!U)continue;let h=(c,l)=>o.push({month:c,currency:s,amount:l,category:r.category||"other",label:r.label});switch(r.frequency){case"per_year":for(let c=0;c*12<t;c++)h(c*12,U*Math.min(1,(t-12*c)/12));break;case"per_semester":for(let c=0;c*6<t;c++)h(c*6,U*Math.min(1,(t-6*c)/6));break;case"per_month":for(let c=0;c<t;c++)h(c,U);break;default:h(Math.min(Number(r.month)||0,t-1),U)}}return o}function O(n,t){return t==="INR"?1:Number(n.fx_rates?.[t])||z[t]}function u0(n,t){let o=n.duration_months||24;return(r,s)=>r==="INR"?1:O(n,r)*(1+t/100*Math.min(1,s/o))}function K0(n,t){return(o,r)=>{if(o==="INR")return 1;let s=P[o],U=t[o],h=Math.min(U+r,s.length-1);return O(n,o)*(s[h].v/s[U].v)}}function c0(n,t){return n.reduce((o,r)=>o+r.amount*t(r.currency,r.month),0)}function j(n){return(n.currency||"INR").toUpperCase()}function k0(n,t,o,r){let s=t.duration_months||24,U=Number(n.moratorium_months)||s+6,h=Math.round((Number(n.tenure_years)||10)*12),c=r.payInterest,l=c?"pay":n.moratorium_interest||"simple",I=c&&Number(n.concession_if_serviced_pct)||0,p=r.rateAt||(()=>Number(n.rate_pct)),_=Math.max(1,Math.ceil(s/6)),d=o/_,A=(Number(n.processing_fee_pct)||0)/100*o+(Number(n.processing_fee_flat)||0),e=n.gst_on_fee!==!1&&j(n)==="INR"?A*D0:0,m=Number(n.other_charges)||0,b=Number(n.insurance_premium)||0,i=n.fee_capitalised?A+e:0,a=(n.fee_capitalised?0:A+e)+m+(n.insurance_financed?0:b),g=0,C=0,f=0,S=0,x=[],L=[],u=i+(n.insurance_financed?b:0);for(let w=0;w<U;w++){w%6===0&&w/6<_&&(g+=d,f+=d),w===0&&(g+=u,f+=u);let Y=Math.max(0,p(w)-I)/1200;if(l==="compound")f+=f*Y;else if(l==="pay"){let F=g*Y;S+=F,x.push(F)}else C+=g*Y;L.push(l==="simple"?g+C:f)}for(let w=Math.ceil(U/6);w<_;w++)g+=d,f+=d;let v=l==="compound"?f:g+(l==="simple"?C:0),R=v-g,$=Math.max(0,Number(r.prepayMonthly)||0),T=v,E=0,B=0,W=0,N=0,H=null,e0=h;for(let w=0;w<h;w++){let Y=Math.max(0,p(U+w))/1200;if(w===0||w%12===0&&Y!==H){let J=h-w;N=Y===0?T/J:T*Y*(1+Y)**J/((1+Y)**J-1),w===0&&(E=N),B=Math.max(B,N),H=Y}let F=T*Y;x.push(F);let X=Math.min(N+$,T+F);if(T=T+F-X,W+=X,L.push(Math.max(0,T)),T<=.5){e0=w+1;break}}let V=a+S+W;return{mode:l,M:U,N:h,tranches:_,principal:g,capitalised:R,repay_principal:v,emi:E,emi_max:B,interest_paid_during_study:S,monthly_interest_during_study:l==="pay"?o*(Number(n.rate_pct)-I)/1200:0,upfront_fees:a,processing_fee:A,processing_gst:e,total_emi_paid:W,total_payback:V,months_to_close:e0,prepay_monthly:$,interestByMonth:x,balanceByMonth:L}}function M0(n){let t=Math.max(0,n-75e3),o=[[4e5,0],[8e5,.05],[12e5,.1],[16e5,.15],[2e6,.2],[24e5,.25],[1/0,.3]],r=0,s=0;for(let[U,h]of o)t>s&&(r+=(Math.min(t,U)-s)*h),s=U;return t<=12e5&&(r=0),r*1.04}function n0(n,t={}){let o={...d0,...n.assumptions||{},...t},r=n.duration_months||24,s=Z(n),U=u0(n,Number(o.fx_shock_pct)||0),h=c0(s,U),c=c0(s,u0(n,0)),l=(Number(n.funds?.scholarship)||0)*O(n,(n.funds?.scholarship_currency||"INR").toUpperCase()),I=Number(n.funds?.savings_inr)||0,p=Math.max(0,h-l),_={};for(let e of s)_[e.category]=(_[e.category]||0)+e.amount*U(e.currency,e.month);let d=s.filter(e=>e.currency==="INR").reduce((e,m)=>e+m.amount,0),M=(n.offers||[]).map(e=>W0(e,n,o,{coa:h,need:p,scholarshipInr:l,savings:I,rateFn:U,inrCosts:d})),A=[...M].sort((e,m)=>e.all_in_inr-m.all_in_inr);A.forEach((e,m)=>{e.rank=m+1});let D=r0(n.university,n.country);return{assumptions:o,fx_used:Object.fromEntries([...new Set(s.map(e=>e.currency).concat((n.offers||[]).map(j)))].filter(e=>e!=="INR").map(e=>[e,y(O(n,e),2)])),coa_inr:y(h),coa_today_inr:y(c),coa_by_category:Object.fromEntries(Object.entries(_).map(([e,m])=>[e,y(m)])),scholarship_inr:y(l),savings_inr:I,offers:M,best_offer_id:A[0]?.id||null,university_benchmark:D?{university:D.university,program:D.program,country:D.country,typical_total_inr:y(D.total_today_inr_lakh*1e5),bad_case_total_inr:y(D.total_bad_case_fx_inr_lakh*1e5),tuition_source:D.tuition_source,living_basis:D.living_basis,vs_plan_pct:y((c-D.total_today_inr_lakh*1e5)/(D.total_today_inr_lakh*1e5)*100,1)}:null}}function W0(n,t,o,r){let s=j(n),U=s==="INR"?1:O(t,s),h=(Number(n.amount)||0)*U,c=Number(n.margin_pct)||0,l=r.need*(1-c/100),I=Math.min(h,l),p=I/U,_=(Number(o.prepay_monthly_inr)||0)/(s==="INR"?1:O(t,s)),d=k0(n,t,p,{payInterest:!!o.pay_interest_during_study,prepayMonthly:_}),M=s==="INR"?1:r.rateFn(s,t.duration_months||24),A=d.total_payback*M,D=Math.max(0,r.coa-r.scholarshipInr-I),e=s==="INR"&&!/international/i.test(n.lender_type||""),m=0;if(o.tax_regime==="old"&&e){let E=d.mode==="pay"?0:d.M;m=d.interestByMonth.slice(d.mode==="pay"?0:d.M,(d.mode==="pay"?0:d.M)+96).reduce((W,N)=>W+N,0)*(Number(o.tax_slab_pct)||30)/100}let b=r.coa>0?(r.coa-r.inrCosts)/r.coa:1,i=Math.max(1,Math.ceil((t.duration_months||24)/12)),a=D*b/i,g=Math.max(0,a-G0)*P0*i,C=D+A-m,f=A-I-m,S=(o.salary_currency||t.currency||"USD").toUpperCase(),x=Number(o.expected_salary)||null,L="your input";if(!x){let E=i0.find(B=>B.country===t.country);E&&(x=E.annual,L=E.source)}let u=d.emi*M,v=null;if(o.return_to_india&&Number(o.india_salary_inr)){let E=Number(o.india_salary_inr),B=(E-M0(E))/12;v={basis:"India salary (new regime tax)",gross_annual:E,currency:"INR",net_monthly_inr:y(B),emi_share_pct:y(u/B*100,1),source:"your input"}}else if(x){let E=Number(o.effective_tax_pct)||F0[t.country]||28,B=x*(1-E/100)/12*O(t,S);v={basis:`Salary abroad, ${E}% effective tax`,gross_annual:x,currency:S,net_monthly_inr:y(B),emi_share_pct:y(u/B*100,1),source:L}}v&&(v.band=v.emi_share_pct<=20?"comfortable":v.emi_share_pct<=35?"stretched":"risky");let R=a0(n.lender),$=null;if(R){let E=Number(n.rate_pct)<R.rate_min?"below published range":R.rate_max!=null&&Number(n.rate_pct)>R.rate_max?"above published range":"within published range";$={lender:R.lender,type:R.type,rate_min:R.rate_min,rate_max:R.rate_max,processing_fee:R.processing_fee,margin_money:R.margin_money,benchmark:R.benchmark,position:E,as_of:R.as_of}}let T=d.balanceByMonth.filter((E,B)=>B%3===0).map(E=>y(E*M));return{id:n.id,lender:n.lender,lender_type:n.lender_type||$?.type||"",currency:s,rate_pct:Number(n.rate_pct),rate_type:n.rate_type||"floating",sanctioned_inr:y(h),drawn_inr:y(I),margin_pct:c,moratorium_months:d.M,tenure_months:d.N,months_to_close:d.months_to_close,moratorium_mode:d.mode,capitalised_interest_inr:y(d.capitalised*M),interest_during_study_inr:y(d.interest_paid_during_study*M),monthly_interest_during_study_inr:y(d.monthly_interest_during_study*M),repay_principal_inr:y(d.repay_principal*M),emi_inr:y(u),emi_currency:s,emi_native:y(d.emi,2),upfront_fees_inr:y(d.upfront_fees*M),processing_gst_inr:y(d.processing_gst*M),total_payback_inr:y(A),family_arranges_inr:y(D),tax_80e_saving_inr:y(m),eligible_80e:e,tcs_blocked_inr:y(g),all_in_inr:y(C),borrowing_cost_inr:y(f),affordability:v,market_benchmark:$,balance_curve_q:T,edited:n.edited||{}}}function s0(n,t){let o=0,r=n.length-1;for(;o<r;){let s=o+r>>1;n[s].month<t?o=s+1:r=s}return o}function H0(n,t={}){let o={...d0,...n.assumptions||{},...t,fx_shock_pct:0},r=n.duration_months||24,s=Z(n),U=[...new Set(s.map(i=>i.currency).concat((n.offers||[]).map(j)))].filter(i=>i!=="INR"),h=(Number(n.funds?.scholarship)||0)*O(n,(n.funds?.scholarship_currency||"INR").toUpperCase()),c=Number(n.funds?.savings_inr)||0,l=s0(G,$0),I=Math.max(r,...(n.offers||[]).map(i=>(Number(i.moratorium_months)||r+6)+Math.round((Number(i.tenure_years)||10)*12))),p=[];for(let i=l;i<G.length-r;i++)p.push(G[i].month);let _=[],d=[],M=Array.from({length:r},()=>[]),A=Object.fromEntries((n.offers||[]).map(i=>[i.id,{all_in:[],emi:[],emi_max:[],payback:[]}]));for(let i of p){let a=Object.fromEntries(U.map(u=>[u,s0(P[u],i)]));if(U.some(u=>a[u]+r>=P[u].length))continue;let g=K0(n,a),C=c0(s,g);_.push(C);let f=0,S=Array(r).fill(0);for(let u of s)S[u.month]+=u.amount*g(u.currency,u.month);for(let u=0;u<r;u++)f+=S[u],M[u].push(f);let x=Math.max(0,C-h),L=s0(G,i);for(let u of n.offers||[]){let v=j(u),R=v==="INR"?1:O(n,v),$=Math.min((Number(u.amount)||0)*R,x*(1-(Number(u.margin_pct)||0)/100)),T=v==="INR"&&(u.rate_type||"floating")==="floating"&&/repo|ebr|eblr|rllr|rblr|brllr/i.test(u.benchmark||u.market_benchmark||"repo"),E=Number(u.rate_pct),B=G[L].v,W=T?Y=>E+Math.max(-O0,G[Math.min(L+Y,G.length-1)].v-B):()=>E,N=k0(u,n,$/R,{payInterest:!!o.pay_interest_during_study,rateAt:W,prepayMonthly:(Number(o.prepay_monthly_inr)||0)/R}),H;if(v==="INR")H=N.total_payback;else{let Y=P[v],F=a[v]??s0(Y,i),X=Q=>R*(Y[Math.min(F+Q,Y.length-1)].v/Y[F].v),J=N.interest_paid_during_study*X(Math.floor(N.M/2)),f0=0;for(let Q=0;Q<N.months_to_close;Q++)f0+=N.total_emi_paid/N.months_to_close*X(N.M+Q);H=N.upfront_fees*R+J+f0}let e0=Math.max(0,C-h-$),V=A[u.id];V.all_in.push(e0+H),V.payback.push(H);let w=v==="INR"?1:R*(P[v][Math.min(a[v]+N.M,P[v].length-1)].v/P[v][a[v]].v);V.emi.push(N.emi*w),V.emi_max.push(N.emi_max*w)}d.push(Math.max(0,x-Math.max(0,...(n.offers||[]).map(u=>{let v=j(u),R=v==="INR"?1:O(n,v);return Math.min((Number(u.amount)||0)*R,x*(1-(Number(u.margin_pct)||0)/100))}),0)))}let D=c0(s,u0(n,0)),e=i=>i.length?{p10:y(K(i,.1)),p50:y(K(i,.5)),p90:y(K(i,.9)),worst:y(Math.max(...i))}:null,m=(n.offers||[]).map(i=>{let a=A[i.id];return{id:i.id,lender:i.lender,all_in:e(a.all_in),emi:e(a.emi),emi_peak_p90:a.emi_max.length?y(K(a.emi_max,.9)):null,payback:e(a.payback)}}),b=[...m].filter(i=>i.all_in).sort((i,a)=>i.all_in.p50-a.all_in.p50);return{method:`Replayed ${_.length} historical start months (${p[0]} onward): actual rupee moves for costs and foreign-currency EMIs, actual RBI repo moves for repo-linked floating loans.`,windows:_.length,coa_today_inr:y(D),coa:e(_),extra_vs_today:e(_.map(i=>i-D)),family_gap:e(d),prob_gap_exceeds_savings:d.length?y(d.filter(i=>i>c).length/d.length,3):null,prob_cost_3l_over_plan:_.length?y(_.filter(i=>i>D+3e5).length/_.length,3):null,recommended_buffer_inr:d.length?y(Math.max(0,K(d,.9)-Math.max(0,K(d,.5)))):null,fan:{months:M.map((i,a)=>a+1),p10:M.map(i=>y(K(i,.1))),p50:M.map(i=>y(K(i,.5))),p90:M.map(i=>y(K(i,.9)))},offers:m,best_offer_typical_id:b[0]?.id||null,repo_now:o0,max_history_months_used:I}}var q=[{id:"shortlist",title:"Shortlist colleges",when:"Find the right course. Pick the one you\u2019ll join."},{id:"admit",title:"Admit and I-20",when:"Get your admit letter and I-20 sorted with Claude."},{id:"finance",title:"Your money",when:"Tell us what your family can pay and how much you need to borrow."},{id:"offers",title:"Loan offers",when:"Add the loan offers you\u2019ve received."},{id:"compare",title:"Compare and choose",when:"See every offer side by side and pick one."},{id:"save",title:"Save your plan",when:"Check your numbers and save your plan."},{id:"repay",title:"Repayment",when:"When EMIs start, how much, and for how long."},{id:"sanction",title:"Sanction and visa",when:"Sign the loan and get your visa."},{id:"study",title:"Ready to study",when:"The last few things before you fly."}],V0={studying:"study",repaying:"repay"},E0={"United States":"I-20","United Kingdom":"CAS",Canada:"study permit",Australia:"CoE",Germany:"visa",Ireland:"visa"},z0={USD:"dollar",GBP:"pound",EUR:"euro",CAD:"Canadian dollar",AUD:"Australian dollar",INR:"rupee"},x0={"United States":"You show bank statements or a loan sanction letter that cover the first year\u2019s cost written on your I-20. You show the same papers at your visa interview.","United Kingdom":"You show the first year\u2019s fees plus \xA31,529 a month for living in London (\xA31,171 outside London) for 9 months. The money must stay in the account for 28 days in a row.",Canada:"You show the first year\u2019s tuition plus CAD 22,895 for living costs, plus your flight.",Australia:"You show AUD 29,710 for a year of living costs plus the first year\u2019s tuition and your flight.",Germany:"You put \u20AC11,904 in a blocked account before your visa. Once you\u2019re there, you get \u20AC992 a month from it.",Ireland:"You show at least \u20AC10,000 a year for living costs, on top of the first year\u2019s fees."},R0={"United States":"On an F-1 visa you can work on campus up to 20 hours a week during term. Jobs off campus need special permission (CPT or OPT).","United Kingdom":"You can work up to 20 hours a week during term, and full time in the holidays.",Canada:"You can work off campus up to 24 hours a week during term.",Australia:"You can work up to 48 hours every two weeks during term.",Germany:"You can work 140 full days or 280 half days a year.",Ireland:"You can work 20 hours a week during term and 40 in the holidays."},k=n=>{let t=Math.round(Number(n)||0);return Math.abs(t)>=1e7?`\u20B9${(t/1e7).toFixed(2)} Cr`:Math.abs(t)>=1e5?`\u20B9${(t/1e5).toFixed(1)}L`:`\u20B9${t.toLocaleString("en-IN")}`},j0=(n,t)=>t==="INR"?1:Number(n.fx_rates?.[t])||z[t]||1;function m0(n){return Z(n).filter(t=>t.month<12).reduce((t,o)=>t+o.amount*j0(n,o.currency),0)}function p0(n){let t=V0[n.stage]||n.stage;return q.some(o=>o.id===t)?t:n.university?n.offers?.length?n.chosen_offer_id?"save":"compare":n.funds?.savings_inr!=null?"offers":"admit":"shortlist"}function q0(n){let t=n.country==="United States",o=(n.offers||[]).some(s=>s.currency==="INR"&&(/sbi|bank of|canara|union|pnb|bob|baroda|indian bank/i.test(s.lender)||/property|collateral|secured/i.test(s.collateral||""))),r=(n.offers||[]).some(s=>s.currency==="USD");return{shortlist:[["passport","Passport valid for the whole course plus 6 months"],["tests","Test scores sent: GRE and IELTS, TOEFL or PTE"],["transcripts","Transcripts and degree certificate"],["sop_lor","Statement of purpose and 2 or 3 recommendation letters"],["app_fees","Application fees budgeted ($75 to $150 each)"]],admit:[["admit_letter","Admit letter"],["deposit","Enrolment deposit paid"],["proof_docs","Proof of funds: bank statements and loan sanction"],[t?"i20":"cas",t?"I-20 issued":`${E0[n.country]||"Admission"} document issued`],["scholarship_letter","Scholarship or assistantship letter, if any"]],offers:[["kyc","PAN and Aadhaar for you and your co-borrower (usually a parent)"],["itr","Co-borrower\u2019s income tax returns or Form 16 for 2 years"],["payslips","Last 3 payslips and 6 months of bank statements"],["marksheets","Marksheets: 10th, 12th and degree"],...o?[["property","Property papers and valuation for the secured loan"]]:[],["two_lenders","Applied to at least 2 lenders (a bank and a private lender)"]],sanction:[["sanction_signed","Sanction letter checked and signed"],["fees_paid","Processing fee paid"],...o?[["mortgage","Property mortgage registered"]]:[],["a2_lrs","Form A2 signed at the bank for sending fees abroad"],[t?"ds160":"visa_app",t?"DS-160 filed and visa interview booked":"Visa application filed"],["forex","Forex card or international account for living costs"]],study:[["tranche","Fee invoice sent to the lender before each semester"],["receipts","Fee receipts saved for every disbursement"],["interest_auto","Monthly interest payment set up (if your family can)"],["address","Lender has your current address and phone"]],repay:[["nach","Auto-debit set up so the EMI is never missed"],["cert_80e","Interest certificate downloaded for 80E (old tax regime)"],["prepay_plan","Prepayment plan for bonuses and raises"],...r?[["usd_income","EMI in dollars matched to dollar income"]]:[],["noc","No-dues letter and property papers back at closure"]]}}var X0={shortlist:["course-compare","course-deep","course-pick"],admit:["tick-docs","i20","proof"],finance:["scholarship","missing","countries"],offers:["add-letter","hidden","bank-questions"],compare:["explain-loan","negotiate","fixed-floating"],save:["parents-hindi","whatsapp","worst"],repay:["prepay","india","cert-80e"],sanction:["visa-prep","bank-visit","revised"],study:["tranche","pay-interest","rupee"]};function w0(n,t){let o=p0(n),r=q.findIndex(e=>e.id===o),s=n.checklist||{},U=q0(n),h=Number(n.funds?.savings_inr)||0,c=null;try{n.costs?.length&&(c=n0(n))}catch{}let l=c&&(c.offers.find(e=>e.id===n.chosen_offer_id)||c.offers.find(e=>e.id===(t||c.best_offer_id)))||null,I=Object.fromEntries(q.map(e=>[e.id,[]])),p=(e,m,b,i)=>I[e].push({tone:m,title:b,text:i}),_=n.country||"",d=e=>e.lender.replace(/ Global Ed-Vantage| Finance$/,""),M=Math.round((Number(n.duration_months)||24)/12),A=z0[n.currency]||"dollar",D=E0[_]||"visa";if(c){let e=c.university_benchmark;if(p("finance","info",`Your degree will cost about ${k(c.coa_today_inr)}`,`That\u2019s tuition, rent, food, insurance and flights for ${M===1?"the whole year":`all ${M} years`}, at today\u2019s ${A} rate.`),e?.typical_total_inr&&e.bad_case_total_inr>e.typical_total_inr){let b=c.coa_today_inr*(e.bad_case_total_inr/e.typical_total_inr);p("finance","warn",`It could go up to ${k(b)}`,`The rupee usually gets weaker over time, so the same fees cost more in rupees. Keep about ${k(b-c.coa_today_inr)} aside for this.`)}e?.typical_total_inr&&Math.abs(e.vs_plan_pct)>15&&p("finance","warn",`Your costs look ${e.vs_plan_pct>0?"higher":"lower"} than usual`,`Students here usually spend about ${k(e.typical_total_inr)}. Check your numbers against the university\u2019s cost sheet.`);let m=Math.max(0,c.coa_today_inr-c.scholarship_inr-h);n.funds?.savings_inr!=null&&p("finance","info",`You\u2019ll need to borrow about ${k(m)}`,`That\u2019s the cost of the degree minus your savings${c.scholarship_inr?" and scholarship":""}. You can change this below.`)}if(p("shortlist","info","Applying costs money too","Most universities charge $75 to $150 per application. Most students apply to 6 to 8."),c){let e=m0(n),m=l?l.sanctioned_inr:0,b=h+m,i=e-b;!m&&n.funds?.savings_inr==null?p("admit","info",`You need to show ${k(e)} for your ${D}`,"The university wants proof that you can pay for the first year. This can be savings, a loan sanction letter, or both. You\u2019ll add your savings in the next step."):i>0&&!m?p("admit","warn",`You need to show ${k(e)} for your ${D}`,`The university wants proof that you can pay for the first year. Your savings cover ${k(h)}. A loan sanction letter can cover the other ${k(i)}.`):i>0?p("admit","bad",`You\u2019re ${k(i)} short for your ${D}`,`You need to show ${k(e)} for the first year. Your savings and loan together cover ${k(b)}.`):p("admit","good",`You have enough to get your ${D}`,`You need to show ${k(e)} for the first year. Your savings${m?" and loan":""} cover ${k(b)}.`),x0[_]&&p("admit","info",`How this works in ${_==="United States"?"the US":_==="United Kingdom"?"the UK":_}`,x0[_])}if(c?.offers.length){let e=c.offers.filter(m=>m.family_arranges_inr>h).slice(0,2);for(let m of e)p("offers","bad",`${d(m)} wants ${k(m.family_arranges_inr)} from you upfront`,`Banks pay only part of the cost and your family pays the rest yourself (this is called margin money). You have ${k(h)} saved, so you\u2019re ${k(m.family_arranges_inr-h)} short.`);if(e.length||p("offers","good","Your savings cover what every bank asks upfront",`The most any offer asks your family to pay yourself is ${k(Math.max(...c.offers.map(m=>m.family_arranges_inr)))}.`),c.offers.length>1){let m=c.offers.map(b=>b.all_in_inr);p("offers","info","Look beyond the interest rate","What you pay back also depends on fees, interest that builds up while you study, and whether the loan is in rupees or dollars. The comparison below adds all of it up.")}else p("offers","warn","You have only one offer","Get at least one more, from a bank and from a private lender. Families often save lakhs by comparing.");for(let m of c.offers.filter(b=>b.market_benchmark?.position==="above published range").slice(0,1))p("offers","warn",`${d(m)}\u2019s rate is higher than it advertises`,"Ask them to match their own published rate before you sign.")}else c&&p("offers","warn","No loan offers yet","Add each offer from the bank\u2019s letter, or ask Claude to read the letters for you.");if(l?(l.upfront_fees_inr>0?p("sanction","info",`${d(l)} will charge ${k(l.upfront_fees_inr)} when you sign`,`That\u2019s the processing fee${l.processing_gst_inr?`, including ${k(l.processing_gst_inr)} GST`:""}. You pay it before the loan is released.`):p("sanction","good",`${d(l)} charges nothing to sign`,"No processing fee on this offer."),l.tcs_blocked_inr>0?p("sanction","warn","Send fees from the loan, not from savings",`When your family sends more than \u20B910 lakh a year abroad from its own money, the bank holds back 5% as tax (about ${k(l.tcs_blocked_inr)} for you). You get it back when you file your tax return. Money sent from an education loan has no such cut.`):p("sanction","good","No tax gets held back on your fee payments","Money sent from an education loan has no tax cut, and what you send from savings stays under \u20B910 lakh a year.")):p("sanction","warn","Pick a loan first","We\u2019ll show what you pay when you sign and the best way to send money abroad."),l&&n.assumptions?.pay_interest_during_study!==!0){let e=null;try{e=n0(n,{pay_interest_during_study:!0}).offers.find(m=>m.id===l.id)}catch{}l.capitalised_interest_inr>0&&p("study","warn","Interest keeps adding up while you study",`You don\u2019t pay EMIs during the course, but about ${k(l.capitalised_interest_inr)} of interest gets added to your loan.${e?` If your family pays ${k(e.monthly_interest_during_study_inr)} a month while you study, you save ${k(l.all_in_inr-e.all_in_inr)} overall.`:""}`)}else l&&p("study","good","You\u2019re paying interest as you go","Your loan won\u2019t grow while you study.");if(R0[_]&&p("study","info","How much you can work",R0[_]),l){let e=l.affordability,m=`\u20B9${Math.round(l.emi_inr).toLocaleString("en-IN")}`;e?.emi_share_pct!=null?p("repay",e.band==="comfortable"?"good":e.band==="stretched"?"warn":"bad",`Your EMI will be ${m} a month`,e.band==="comfortable"?`That\u2019s ${Math.round(e.emi_share_pct)}% of your take-home salary, which is comfortable.`:e.band==="stretched"?`That\u2019s ${Math.round(e.emi_share_pct)}% of your take-home salary. Manageable, but tight. Paying a little extra early helps.`:`That\u2019s ${Math.round(e.emi_share_pct)}% of your take-home salary, which is a lot. Look at a longer loan or a cheaper offer.`):p("repay","info",`Your EMI will be ${m} a month`,"Add your expected salary to see if this is comfortable.");try{let b=n0(n,{prepay_monthly_inr:25e3}).offers.find(i=>i.id===l.id);b&&b.months_to_close<l.months_to_close&&p("repay","info",`Pay \u20B925,000 extra a month and save ${k(l.all_in_inr-b.all_in_inr)}`,`You\u2019d finish the loan in ${(b.months_to_close/12).toFixed(1)} years instead of ${(l.months_to_close/12).toFixed(1)}. Banks can\u2019t charge you for paying early on a floating-rate loan.`)}catch{}n.assumptions?.tax_regime==="old"?p("repay","good",`Your family saves about ${k(l.tax_80e_saving_inr)} in tax`,"Under the old tax regime, the interest you pay is tax-free for 8 years (Section 80E). Ask the bank for an interest certificate every year."):p("repay","info","Tax saving works only in the old tax regime","Whoever repays can claim the interest under Section 80E for 8 years, but only under the old tax regime. Compare both before choosing.")}return{current:o,stages:q.map((e,m)=>{let b=(U[e.id]||[]).map(([i,a])=>({key:i,label:a,done:!!s[i]}));return{...e,status:m<r?"done":m===r?"now":"next",checks:I[e.id],checklist:b,ticked:b.filter(i=>i.done).length,prompts:X0[e.id]}})}}return B0(J0);})();
