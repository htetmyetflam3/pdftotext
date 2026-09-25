import { useEffect, useState } from "react";
import ConverterArt from "./art/ConverterArt";

function openPdf() {
  window.dispatchEvent(new CustomEvent("akkhara:open-pdf"));
}
function openGrammar() {
  window.dispatchEvent(new CustomEvent("akkhara:open-grammar"));
}

export default function Hero() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (window.innerWidth < 1024) return;
      setSlide((n) => (n === 0 ? 1 : 0));
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section id="hero">
      <div className="lp-hero lp-wrap" id="heroSlider">
        <div className="lp-hero-kicker">
          <span className="lp-kicker ak-micro">myanmar pdf → selectable text</span>
          <span className="ak-micro" style={{ color: "#7c7466" }}>
            zawgyi · unicode · docx · txt
          </span>
        </div>

        <div className="lp-desktop">
          <div className="lp-stage">
            <button
              type="button"
              className="lp-arrow lp-arrow-prev"
              aria-label="Previous slide"
              onClick={() => setSlide((n) => (n === 0 ? 1 : 0))}
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="lp-arrow lp-arrow-next"
              aria-label="Next slide"
              onClick={() => setSlide((n) => (n === 0 ? 1 : 0))}
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
            <div className="lp-track" id="heroTrack" style={{ transform: `translateX(-${slide * 100}%)` }}>
              <div className="lp-slide">
                <div className="lp-art">
                  <div className="lp-frame">
                    <div className="lp-chrome lp-chrome-blue">
                      <div className="lp-dots">
                        <span className="lp-dot lp-dot-r" />
                        <span className="lp-dot lp-dot-y" />
                        <span className="lp-dot lp-dot-g" />
                        <span className="lp-chrome-title">zawgyi_to_unicode.exe</span>
                      </div>
                      <span className="lp-chrome-pill">100% Accuracy</span>
                    </div>
                    <div className="lp-screen">
                      {/* slide 01 art: the ui project's animated SVG, not the old PNG */}
                      <ConverterArt />
                      <div className="lp-callout">
                        <div className="lp-callout-left">
                          <div className="lp-callout-ico is-blue">
                            <i className="bi bi-file-earmark-text" />
                          </div>
                          <div>
                            <div className="lp-callout-kicker is-blue">Original Zawgyi PDF (2006-2018)</div>
                            <div className="lp-callout-line">
                              ျမန္မာႏိုင္ငံ <i className="bi bi-arrow-right" /> မြန်မာနိုင်ငံ (Selectable)
                            </div>
                          </div>
                        </div>
                        <button type="button" className="lp-callout-btn is-amber" data-open-pdf onClick={openPdf}>
                          <i className="bi bi-stars" /> Test Sample PDF
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="lp-float">
                    <span className="lp-ping" />
                    <span>Other converters juggle? We fix 100% font ligature order</span>
                  </div>
                </div>

                <div className="lp-copy">
                  <div className="lp-chip is-blue">
                    <span className="lp-chip-dot" />
                    <span>01 / pdf → text</span>
                  </div>
                  <h1 className="lp-h1">
                    Zawgyi PDF ကို
                    <br />
                    <span className="lp-grad">ဖတ်လို့ရတဲ့ စာသား</span>
                  </h1>
                  <p className="lp-lead">
                    ဟောင်းကျင်းနေတဲ့ Zawgyi ဖောင်တော်နဲ့ ရေးထားတဲ့ PDF တွေကို ဖတ်လို့ရ၊ ကူးယူလို့ရ၊ ပြင်လို့ရတဲ့ Unicode
                    စာသားအဖြစ် ပြောင်းပေးပါတယ်။ စာလုံးပျက်စီးမှု မရှိတော့ဘူး။
                  </p>
                  <p className="lp-en">Legacy Zawgyi PDF → selectable Unicode text, .txt &amp; .docx export.</p>
                  <div className="lp-actions">
                    <button type="button" className="lp-btn lp-btn-blue" data-open-pdf onClick={openPdf}>
                      <i className="bi bi-play-fill" /> နမူနာ စမ်းကြည့်ရန်
                    </button>
                    <a href="#how" className="lp-btn lp-btn-ghost">
                      နည်းပညာ ကြည့်ရန်
                    </a>
                  </div>
                  <p className="lp-btn-note">sample pdf ဖြင့် စမ်းကြည့်မယ်</p>
                </div>
              </div>

              <div className="lp-slide">
                <div className="lp-art">
                  <div className="lp-frame is-indigo">
                    <div className="lp-chrome lp-chrome-indigo">
                      <div className="lp-dots">
                        <span className="lp-dot lp-dot-r" />
                        <span className="lp-dot lp-dot-y" />
                        <span className="lp-dot lp-dot-g" />
                        <span className="lp-chrome-title">burmese_orthography_ai.sys</span>
                      </div>
                      <span className="lp-chrome-pill">Deep Neural Spellcheck</span>
                    </div>
                    <div className="lp-screen">
                      <img src="/images/hero-grammar.png" alt="Burmese Spell and Grammar Checker" />
                      <div className="lp-text-board" aria-label="Corrected Burmese sample on the document board">
                        <div className="lp-text-board-bar">
                          <span className="lp-text-board-tag">Spellcheck</span>
                          <span className="lp-text-board-ok">
                            <i className="bi bi-check-lg" /> Verified
                          </span>
                        </div>
                        <p className="lp-text-board-p">
                          <mark>ယနေ့ခေတ်</mark> နည်းပညာ တိုးတက်လာမှုကြောင့် ကျွန်တော်တို့ အလုပ်လုပ်ရာတွင် အဆင်ပြေခြင်းများစွာ
                          ရှိလာပါသည်။
                        </p>
                        <p className="lp-text-board-p">
                          ရုံးစာရွက်စာတမ်းများကို စနစ်တကျ မသိမ်းဆည်းပါက <mark>အချက်အလက်</mark> ဆုံးရှုံးနိုင်ပါသည်။
                        </p>
                        <p className="lp-text-board-p">
                          မြန်မာစာသတ်ပုံကျမ်းစံနှုန်းအတိုင်း သဒ္ဒါနှင့် စာလုံးပေါင်းအမှားများကို တိကျစွာ စစ်ဆေးပါသည်။
                        </p>
                      </div>
                      <div className="lp-callout">
                        <div className="lp-callout-left">
                          <div className="lp-callout-ico is-indigo">
                            <i className="bi bi-stars" />
                          </div>
                          <div>
                            <div className="lp-callout-kicker is-indigo">Myanmar Orthography Standards</div>
                            <div className="lp-callout-line">သတ်ပုံနှင့် ဝါကျဖွဲ့စည်းမှု အမှားစစ်ဆေးခြင်း</div>
                          </div>
                        </div>
                        <button type="button" className="lp-callout-btn is-indigo" data-open-grammar onClick={openGrammar}>
                          Upload Document
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="lp-float">
                    <span className="lp-pulse" />
                    <span>မြန်မာစာအဖွဲ့ သတ်ပုံကျမ်းစံနှုန်း အပြည့်အဝလိုက်နာထားသည်</span>
                  </div>
                </div>

                <div className="lp-copy">
                  <div className="lp-chip is-indigo">
                    <span className="lp-chip-dot" />
                    <span>BURMESE SPELL &amp; GRAMMAR CHECKING</span>
                  </div>
                  <h1 className="lp-h1">
                    Burmese Spell &amp;
                    <br />
                    <span className="lp-grad is-indigo">Grammar Checker</span>
                    <br />
                    With AI Precision.
                  </h1>
                  <p className="lp-lead">
                    မြန်မာစာသတ်ပုံ၊ သဒ္ဒါ၊ အောက်မြစ်နှင့် ရှေ့ထိုးအမှားများကို အချိန်နှင့်တစ်ပြေးညီ စစ်ဆေးပြင်ဆင်ပေးသည်။
                    ရုံးသုံးစာရွက်စာတမ်းများနှင့် ဆောင်းပါးများအတွက် အထူးသင့်လျော်ပါသည်။
                  </p>
                  <div className="lp-checks">
                    <div className="lp-check">
                      <i className="bi bi-check-circle-fill is-indigo" />
                      <span>မြန်မာစာလုံးပေါင်း သတ်ပုံကျမ်း အခြေခံ စစ်ဆေးစနစ်</span>
                    </div>
                    <div className="lp-check">
                      <i className="bi bi-check-circle-fill is-indigo" />
                      <span>Drag &amp; Drop ဖြင့် Word, PDF, Text ဖိုင်များကို တိုက်ရိုက်ထည့်သွင်းနိုင်ခြင်း</span>
                    </div>
                  </div>
                  <div className="lp-actions">
                    <button type="button" className="lp-btn lp-btn-indigo" data-open-grammar onClick={openGrammar}>
                      <i className="bi bi-file-earmark-text" /> Upload Your Document
                    </button>
                    <button type="button" className="lp-btn lp-btn-ghost" data-open-grammar onClick={openGrammar}>
                      Open Text Editor
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="lp-pager">
              <button
                type="button"
                data-slide="0"
                className={slide === 0 ? "is-active is-blue" : ""}
                onClick={() => setSlide(0)}
              >
                <span>1</span>
                <span>Zawgyi PDF OCR</span>
              </button>
              <button
                type="button"
                data-slide="1"
                className={slide === 1 ? "is-active is-indigo" : ""}
                onClick={() => setSlide(1)}
              >
                <span>2</span>
                <span>Spell &amp; Grammar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
