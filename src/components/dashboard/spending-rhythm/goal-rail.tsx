import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import { GoalCard, type GoalData } from "../../GoalCard"

export function GoalRail({ activeGoals }: { activeGoals: GoalData[] }) {
  return (
    <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
      <CarouselContent className="-ml-4">
        {activeGoals.map((goal) => (
          <CarouselItem key={goal._id} className="pl-4 basis-auto">
            <GoalCard goal={goal} />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}
