import { useRef, useEffect, useMemo, ReactNode } from 'react';
import { gsap } from 'gsap';
import './StickerPeel.css';

interface StickerPeelProps {
    children?: ReactNode;
    width?: number | string;
    rotate?: number;
    peelBackHoverPct?: number;
    peelBackActivePct?: number;
    peelEasing?: string;
    peelHoverEasing?: string;
    shadowIntensity?: number;
    lightingIntensity?: number;
    peelDirection?: number;
    className?: string;
    isDragging?: boolean;
}

const StickerPeel = ({
    children,
    rotate = 0,
    peelBackHoverPct = 30,
    peelBackActivePct = 40,
    peelEasing = 'power3.out',
    peelHoverEasing = 'power2.out',
    width = '100%',
    shadowIntensity = 0.6,
    lightingIntensity = 0.1,
    peelDirection = 0,
    className = '',
    isDragging = false
}: StickerPeelProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const dragTargetRef = useRef<HTMLDivElement>(null);
    const pointLightRef = useRef<SVGPointLightElement>(null);
    const pointLightFlippedRef = useRef<SVGPointLightElement>(null);

    const defaultPadding = 10;

    useEffect(() => {
        const updateLight = (e: MouseEvent) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            gsap.set(pointLightRef.current, { attr: { x, y } });

            const normalizedAngle = Math.abs(peelDirection % 360);
            if (normalizedAngle !== 180) {
                gsap.set(pointLightFlippedRef.current, { attr: { x, y: rect.height - y } });
            } else {
                gsap.set(pointLightFlippedRef.current, { attr: { x: -1000, y: -1000 } });
            }
        };

        // If dragging, we might want to simulate light movement or just center it?
        // For now, let's just listen to document mousemove if dragging
        if (isDragging) {
            document.addEventListener('mousemove', updateLight);
            return () => document.removeEventListener('mousemove', updateLight);
        }

        const container = containerRef.current;
        if (container) {
            container.addEventListener('mousemove', updateLight);
            return () => container.removeEventListener('mousemove', updateLight);
        }
    }, [peelDirection, isDragging]);

    const cssVars = useMemo(
        () => ({
            '--sticker-rotate': `${rotate}deg`,
            '--sticker-p': `${defaultPadding}px`,
            '--sticker-peelback-hover': `${peelBackHoverPct}%`,
            '--sticker-peelback-active': `${peelBackActivePct}%`,
            '--sticker-peel-easing': peelEasing,
            '--sticker-peel-hover-easing': peelHoverEasing,
            '--sticker-width': typeof width === 'number' ? `${width}px` : width,
            '--sticker-shadow-opacity': shadowIntensity,
            '--sticker-lighting-constant': lightingIntensity,
            '--peel-direction': `${peelDirection}deg`
        } as any),
        [
            rotate,
            peelBackHoverPct,
            peelBackActivePct,
            peelEasing,
            peelHoverEasing,
            width,
            shadowIntensity,
            lightingIntensity,
            peelDirection
        ]
    );

    return (
        <div className={`draggable-sticker ${className}`} ref={dragTargetRef} style={cssVars}>
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <filter id="pointLight">
                        <feGaussianBlur stdDeviation="1" result="blur" />
                        <feSpecularLighting
                            result="spec"
                            in="blur"
                            specularExponent="100"
                            specularConstant={lightingIntensity}
                            lightingColor="white"
                        >
                            <fePointLight ref={pointLightRef} x="100" y="100" z="300" />
                        </feSpecularLighting>
                        <feComposite in="spec" in2="SourceGraphic" result="lit" />
                        <feComposite in="lit" in2="SourceAlpha" operator="in" />
                    </filter>

                    <filter id="pointLightFlipped">
                        <feGaussianBlur stdDeviation="10" result="blur" />
                        <feSpecularLighting
                            result="spec"
                            in="blur"
                            specularExponent="100"
                            specularConstant={lightingIntensity * 7}
                            lightingColor="white"
                        >
                            <fePointLight ref={pointLightFlippedRef} x="100" y="100" z="300" />
                        </feSpecularLighting>
                        <feComposite in="spec" in2="SourceGraphic" result="lit" />
                        <feComposite in="lit" in2="SourceAlpha" operator="in" />
                    </filter>

                    <filter id="dropShadow">
                        <feDropShadow
                            dx="2"
                            dy="4"
                            stdDeviation={3 * shadowIntensity}
                            floodColor="black"
                            floodOpacity={shadowIntensity}
                        />
                    </filter>

                    <filter id="expandAndFill">
                        <feOffset dx="0" dy="0" in="SourceAlpha" result="shape" />
                        <feFlood floodColor="rgb(179,179,179)" result="flood" />
                        <feComposite operator="in" in="flood" in2="shape" />
                    </filter>
                </defs>
            </svg>

            <div className={`sticker-container ${isDragging ? 'is-dragging' : ''}`} ref={containerRef}>
                <div className="sticker-main">
                    <div className="sticker-lighting">
                        <div className="sticker-content">
                            {children}
                        </div>
                    </div>
                </div>

                <div className="flap">
                    <div className="flap-lighting">
                        <div className="flap-content">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StickerPeel;
