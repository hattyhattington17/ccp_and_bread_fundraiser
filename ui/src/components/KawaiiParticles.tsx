import { useEffect } from 'react';
import { tsParticles } from '@tsparticles/engine';
import { loadAll } from '@tsparticles/all';
import { loadEmojiShape } from '@tsparticles/shape-emoji';
import configs from '@tsparticles/configs';
import background from '@/assets/cute-anime-pastel.jpg';

const config = configs.nyancat2;

export default function KawaiiParticles() {
  useEffect(() => {
    loadAll(tsParticles);
    loadEmojiShape(tsParticles);

    tsParticles
      .load({
        id: 'tsparticles',
        options: {
          ...config,
          fullScreen: {
            enable: true,
            zIndex: -1,
          },
          background: {
            image: `url('${background.src}')`,
            repeat: 'no-repeat',
            position: 'center',
            color: 'pink',
          },
          particles: {
            ...config.particles,
            shape: {
              type: 'emoji',
              options: {
                emoji: [
                  { value: '🍬' },
                  { value: '🍭' },
                  { value: '🍫' },
                  { value: '🍩' },
                  { value: '🍪' },
                  { value: '🍰' },
                  { value: '🍦' },
                  { value: '🍧' },
                  { value: '🍨' },
                  { value: '🎂' },
                ],
              },
            },
            size: {
              value: 10,
            },
          },
        },
      })
      .then((container) => {
        container?.play();
        console.log('tsparticles loaded', container);
      })
      .catch((error) => {
        console.error('Error loading tsparticles', error);
      });
  });

  return <div id="tsparticles"></div>;
}
