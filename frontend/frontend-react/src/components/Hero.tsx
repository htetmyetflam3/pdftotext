import { useEffect, useState } from "react";
import ConverterArt from "./art/ConverterArt";
import OcrArt from "./art/OcrArt";

function openPdf() {
  window.dispatchEvent(new CustomEvent("akkhara:open-pdf"));
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
          <span className="lp-kicker ak-micro">myanmar pdf → reviewable text</span>
          <span className="ak-micro" style={{ color: "#7c7466" }}>
            text extraction · custom ocr · docx · txt
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
              {/* Position 01: text-based PDF extraction */}
              <div className="lp-slide">
                <div className="lp-art">
                  <div className="lp-frame">
                    <div className="lp-chrome lp-chrome-blue">
                      <div className="lp-dots">
                        <span className="lp-dot lp-dot-r" />
                        <span className="lp-dot lp-dot-y" />
                        <span className="lp-dot lp-dot-g" />
                        <span className="lp-chrome-title">embedded_font_parser.exe</span>
                      </div>
                      <span className="lp-chrome-pill">TEXT-BASED PDF</span>
                    </div>
                    <div className="lp-screen">
                      <ConverterArt />
                      <div className="lp-callout">
                        <div className="lp-callout-left">
                          <div className="lp-callout-ico is-blue">
                            <i className="bi bi-file-earmark-text" />
                          </div>
                          <div>
                            <div className="lp-callout-kicker is-blue">Embedded-text Myanmar PDF</div>
                            <div className="lp-callout-line">
                              ျမန္မာႏိုင္ငံ <i className="bi bi-arrow-right" /> မြန်မာနိုင်ငံ (reviewable)
                            </div>
                          </div>
                        </div>
                        <button type="button" className="lp-callout-btn is-amber" data-open-pdf onClick={openPdf}>
                          <i className="bi bi-stars" /> View Sample Comparison
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="lp-float">
                    <span className="lp-ping" />
                    <span>Embedded Myanmar font maps decoded page by page</span>
                  </div>
                </div>

                <div className="lp-copy">
                  <div className="lp-chip is-blue">
                    <span className="lp-chip-dot" />
                    <span>01 / text-based pdf → text</span>
                  </div>
                  <h1 className="lp-h1">
                    Zawgyi PDF ကို
                    <br />
                    <span className="lp-grad">စစ်ဆေးလို့ရတဲ့ စာသား</span>
                  </h1>
                  <p className="lp-lead">
                    စာသားအလွှာပါသော Zawgyi PDF ထဲက embedded font mapping ကို ဖတ်ပြီး Unicode စာသားအဖြစ် ထုတ်ပေးပါတယ်။
                    ရလဒ်ကို မူရင်း PDF နဲ့ နှိုင်းယှဉ်စစ်ဆေးပြီး TXT သို့မဟုတ် DOCX အဖြစ် ဆက်သုံးနိုင်ပါတယ်။
                  </p>
                  <p className="lp-en">
                    Text-based legacy Myanmar PDFs → reviewable Unicode text with TXT and DOCX export.
                  </p>
                  <div className="lp-actions">
                    <button type="button" className="lp-btn lp-btn-blue" data-open-pdf onClick={openPdf}>
                      <i className="bi bi-play-fill" /> နမူနာ နှိုင်းယှဉ်ရန်
                    </button>
                    <a href="#how" className="lp-btn lp-btn-ghost">
                      အလုပ်လုပ်ပုံ ကြည့်ရန်
                    </a>
                  </div>
                  <p className="lp-btn-note">100-page test fixture · output review recommended</p>
                </div>
              </div>

              {/* Position 02: image-only PDF OCR */}
              <div className="lp-slide">
                <div className="lp-art">
                  <div className="lp-frame is-indigo">
                    <div className="lp-chrome lp-chrome-indigo">
                      <div className="lp-dots">
                        <span className="lp-dot lp-dot-r" />
                        <span className="lp-dot lp-dot-y" />
                        <span className="lp-dot lp-dot-g" />
                        <span className="lp-chrome-title">myanmar_ocr_pipeline.dev</span>
                      </div>
                      <span className="lp-chrome-pill">IN DEVELOPMENT</span>
                    </div>
                    <div className="lp-screen">
                      <OcrArt />
                      <div className="lp-callout">
                        <div className="lp-callout-left">
                          <div className="lp-callout-ico is-indigo">
                            <i className="bi bi-bounding-box-circles" />
                          </div>
                          <div>
                            <div className="lp-callout-kicker is-indigo">Custom Myanmar OCR</div>
                            <div className="lp-callout-line">Tesseract model + AKKHARA processing logic</div>
                          </div>
                        </div>
                        <a href="#compare" className="lp-callout-btn is-indigo">
                          Development Preview
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="lp-float">
                    <span className="lp-pulse" />
                    <span>Tesseract recognition model · custom Myanmar document logic</span>
                  </div>
                </div>

                <div className="lp-copy">
                  <div className="lp-chip is-indigo">
                    <span className="lp-chip-dot" />
                    <span>02 / image-only pdf → ocr text</span>
                  </div>
                  <h2 className="lp-h1">
                    Scanned Burmese PDF ကို
                    <br />
                    <span className="lp-grad is-indigo">Custom OCR နဲ့ ဖတ်မယ်</span>
                  </h2>
                  <p className="lp-lead">
                    စာသားအလွှာမပါတဲ့ scan စာမျက်နှာတွေအတွက် Tesseract ရဲ့ recognition model ကို AKKHARA ရဲ့ ကိုယ်ပိုင်
                    document analysis နဲ့ Myanmar processing logic တို့နဲ့ ပေါင်းစပ်နေပါတယ်။ ဒီ OCR လမ်းကြောင်းက လက်ရှိ
                    ဖွံ့ဖြိုးဆဲ ဖြစ်ပါတယ်။
                  </p>
                  <p className="lp-en">
                    Custom OCR for image-only Burmese PDFs — Tesseract model, AKKHARA logic, currently in development.
                  </p>
                  <div className="lp-checks">
                    <div className="lp-check">
                      <i className="bi bi-check-circle-fill is-indigo" />
                      <span>Tesseract recognition model ကို အသုံးပြုခြင်း</span>
                    </div>
                    <div className="lp-check">
                      <i className="bi bi-check-circle-fill is-indigo" />
                      <span>ကိုယ်ပိုင် Myanmar page analysis နှင့် ပြန်လည်စီစဉ် logic</span>
                    </div>
                  </div>
                  <div className="lp-actions">
                    <a href="#compare" className="lp-btn lp-btn-indigo">
                      <i className="bi bi-diagram-3" /> OCR အစီအစဉ် ကြည့်ရန်
                    </a>
                    <button type="button" className="lp-btn lp-btn-ghost" data-open-pdf onClick={openPdf}>
                      Text Extraction စမ်းရန်
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
                <span>PDF Text Extraction</span>
              </button>
              <button
                type="button"
                data-slide="1"
                className={slide === 1 ? "is-active is-indigo" : ""}
                onClick={() => setSlide(1)}
              >
                <span>2</span>
                <span>Custom OCR · In Development</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
