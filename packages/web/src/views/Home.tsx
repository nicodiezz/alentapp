import { Box, SimpleGrid, Heading, Text, VStack } from "@chakra-ui/react";
import { LuUsers, LuDollarSign, LuShieldAlert, LuDumbbell, LuFileBadge, LuArchive, LuPackage } from "react-icons/lu";
import { SectionCard } from "../components/SectionCard";

export function HomeView() {
  return (
    <Box>
      <VStack gap="6" align="flex-start" mb="12">
        <Heading
          size="4xl"
          fontWeight="extrabold"
          letterSpacing="tight"
          bgGradient="to-r"
          gradientFrom="blue.600"
          gradientTo="cyan.400"
          bgClip="text"
        >
          Bienvenido a Alentapp
        </Heading>
        <Text fontSize="xl" color="fg.muted" maxW="2xl">
          El panel de administración central para gestionar todos los aspectos de tu club.
          Selecciona una sección a continuación para comenzar.
        </Text>
      </VStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="8">
        <SectionCard
          title="Miembros"
          description="Administra el padrón de socios, sus categorías, estados de cuenta y datos personales."
          to="/members"
          icon={LuUsers}
        />
        <SectionCard
          title="Pagos"
          description="Administra los pagos de los socios, sus importes, fechas y estados."
          to="/payments"
          icon={LuDollarSign}
        />

        <SectionCard
          title="Deportes"
          description="Registra deportes disponibles, cupos, precios adicionales y requisitos médicos."
          to="/sports"
          icon={LuDumbbell}
         />
        
        <SectionCard
          title="Suspensiones"
          description="Registra y gestiona las sanciones y suspensiones disciplinarias de los miembros del club."
          to="/disciplines"
          icon={LuShieldAlert}
        />
    
        <SectionCard 
          title="Certificados Médicos"
          description="Gestiona los certificados medicos de los socios para habilitar su actividad fisica en el club."
          to="/medical-certificates"
          icon={LuFileBadge}
        />

        <SectionCard
          title="Casilleros"
          description="Registra casilleros disponibles, sus ubicaciones y estados de asignación."
          to="/lockers"
          icon={LuArchive}
        />
        
        <SectionCard
          title="Equipamiento"
          description="Gestiona prestamos de materiales deportivos, fechas de devolucion y estados."
          to="/equipment-loans"
          icon={LuPackage}
        />

        {/* Future sections can be added here following the same pattern */}
        <Box
          p="6"
          bg="bg.muted/30"
          borderRadius="2xl"
          borderWidth="1px"
          borderColor="border.subtle"
          borderStyle="dashed"
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="250px"
        >
          <VStack>
            <Text color="fg.muted" fontWeight="medium">Próximamente nuevas secciones</Text>
          </VStack>
        </Box>
      </SimpleGrid>
    </Box>
  );
}
