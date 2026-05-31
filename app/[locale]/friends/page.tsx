"use client";

import { useState } from "react";
import FakeAdModal from "@/components/fake-ad-modal";

const AdsPage = () => {
  const [isAdOpen, setIsAdOpen] = useState(true);

  return (
    <>
      {isAdOpen && <FakeAdModal onClose={() => setIsAdOpen(false)} />}
      <div className="w-80 m-auto flex flex-col text-lg gap-2">
        <p>
          Русский? Средства за рекламные показы на этом сайте автоматически зачисляются на спецсчет поддержки
          Вооруженных Сил Украины. Ты только что подписал себе приговор от 12 до 20 лет лишения свободы.
        </p>
        <p>
          Согласно статье 275 УК РФ:
          <br />
          <i>
            Оказание финансовой, материально-технической, консультационной или иной помощи иностранному
            государству/организации в деятельности, направленной против безопасности РФ.
          </i>
        </p>
        <p>
          Твои IP, провайдер, геолокация зафиксированы и будут переданы в Киберполицию Украины и СБУ для последующей
          публикации в открытых open-data реестрах.
        </p>
        <p className="text-lg">Следуй за курсом русского военного корабля с этого сайта и моей страны 🇺🇦</p>
        <h2 className="text-2xl font-bold">🦆uck russians</h2>
      </div>
    </>
  );
};

export default AdsPage;
