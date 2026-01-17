import { useStore } from "@nanostores/react";
import { $user } from "@/lib/authStore";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UseAsTemplateButton() {
  const user = useStore($user);
  
  const getTemplateUrl = () => {
    if (!user) return "/register";
    
    const demoData = {
      name: "Copy of DEMO Project",
      develop_config: "node: 18.1.0\npostgres: 14.1\nredis: 6.2\nstripe_api_version: 2022-11-15",
      staging_config: "node: 18.1.0\npostgres: 14.1\nredis: 6.2\nstripe_api_version: 2022-11-15",
      production_config: "node: 16.15.0\npostgres: 12.8\nredis: 6.0\nstripe_api_version: 2020-08-27",
    };

    const params = new URLSearchParams();
    params.set("template", "true");
    params.set("name", demoData.name);
    params.set("develop_config", demoData.develop_config);
    params.set("staging_config", demoData.staging_config);
    params.set("production_config", demoData.production_config);

    return `/projects/new?${params.toString()}`;
  };

  return (
    <a href={getTemplateUrl()} className={cn(buttonVariants({ variant: "default", size: "lg" }))}>
      Use as Template
    </a>
  );
}
